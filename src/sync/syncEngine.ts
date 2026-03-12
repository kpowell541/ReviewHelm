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
 */

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
  details?: string;
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

    // Run adapters sequentially — order matters for consistency
    results.push(await syncSessions());
    results.push(await syncTrackedPRs());
    results.push(await syncTutorConversations());
    results.push(await syncPreferences());
    results.push(await syncConfidence());
    results.push(await syncUsage());
    results.push(await syncBookmarksTemplatesRepoConfigs());

    // Sync subscription tier & credit balance (pull-only)
    try {
      await useTierStore.getState().syncTier();
    } catch {
      // Non-critical — tier info stays cached
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
