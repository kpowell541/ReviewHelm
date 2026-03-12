import { useAuthStore } from '../store/useAuthStore';
import { useSyncStore } from '../store/useSyncStore';
import { useTierStore } from '../store/useTierStore';
import { syncSessions } from './sessionSync';
import { syncTrackedPRs } from './trackedPRSync';
import { syncTutorConversations } from './tutorSync';
import {
  syncPreferences,
  syncConfidence,
  syncUsage,
  syncBookmarksTemplatesRepoConfigs,
} from './preferencesSync';
import type { AdapterResult } from './types';

/**
 * Local-first sync engine.
 * All stores work offline. When online + authenticated, data is
 * pushed/pulled in the background with last-write-wins conflict resolution.
 *
 * Each domain has its own adapter (sessionSync, trackedPRSync, etc.)
 * with explicit push, pull, delete, and merge responsibilities.
 *
 * Circuit breaker: if any adapter fails with a 401/auth error, remaining
 * adapters are skipped to prevent a cascade of failed requests (e.g. when
 * Supabase rate-limits the refresh token).
 */

const AUTH_ERROR_PATTERNS = [
  'unauthorized',
  '401',
  'invalid or expired token',
  'missing bearer token',
  'jwt expired',
  'invalid refresh token',
];

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
  details?: string;
}

function isAuthFailure(result: AdapterResult): boolean {
  return result.errors.some((err) => {
    const lower = err.toLowerCase();
    return AUTH_ERROR_PATTERNS.some((p) => lower.includes(p));
  });
}

async function isOnlineAndAuthenticated(): Promise<boolean> {
  const token = await useAuthStore.getState().getAccessToken();
  return token !== null;
}

export async function runSync(): Promise<SyncResult> {
  const syncStore = useSyncStore.getState();

  if (syncStore.syncing) {
    return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };
  }

  if (!(await isOnlineAndAuthenticated())) {
    return { pushed: 0, pulled: 0, errors: ['Not authenticated'] };
  }

  syncStore.markSyncStart();
  const allErrors: string[] = [];
  let totalPushed = 0;
  let totalPulled = 0;

  try {
    const results: AdapterResult[] = [];
    let authFailed = false;

    const adapters = [
      syncSessions,
      syncTrackedPRs,
      syncTutorConversations,
      syncPreferences,
      syncConfidence,
      syncUsage,
      syncBookmarksTemplatesRepoConfigs,
    ];

    for (const adapter of adapters) {
      const result = await adapter();
      results.push(result);

      if (isAuthFailure(result)) {
        authFailed = true;
        break;
      }
    }

    // Skip tier sync if auth already failed
    if (!authFailed) {
      try {
        await useTierStore.getState().syncTier();
      } catch {
        // Non-critical — tier info stays cached
      }
    }

    // Aggregate results
    const detailParts: string[] = [];
    for (const r of results) {
      totalPushed += r.pushed;
      totalPulled += r.pulled;
      allErrors.push(...r.errors);
      if (r.pushed || r.pulled) {
        detailParts.push(`${r.label}: ${r.pushed}↑ ${r.pulled}↓`);
      }
    }

    if (authFailed) {
      allErrors.push('Auth failure — skipped remaining sync adapters');
    }

    if (allErrors.length > 0) {
      syncStore.markSyncFailure(allErrors.slice(0, 3).join(' | '));
    } else {
      const version = new Date().toISOString();
      syncStore.markSyncSuccess(version);
    }

    return {
      pushed: totalPushed,
      pulled: totalPulled,
      errors: allErrors,
      details: detailParts.join(', '),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    allErrors.push(message);
    syncStore.markSyncFailure(message);
    return { pushed: totalPushed, pulled: totalPulled, errors: allErrors };
  }
}
