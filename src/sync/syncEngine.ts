import { api, ApiError } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSessionStore } from '../store/useSessionStore';
import { useConfidenceStore } from '../store/useConfidenceStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useSyncStore } from '../store/useSyncStore';
import type { Session } from '../data/types';

/**
 * Local-first sync engine.
 * All stores work offline. When online + authenticated, data is
 * pushed/pulled in the background with last-write-wins conflict resolution.
 */

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

interface SessionListResponse {
  items: Session[];
  nextCursor: string | null;
}

async function isOnlineAndAuthenticated(): Promise<boolean> {
  const token = await useAuthStore.getState().getAccessToken();
  return token !== null;
}

async function pushSessionSnapshot(session: Session): Promise<void> {
  await api.patch(`/sessions/${session.id}`, {
    title: session.title,
  });

  for (const [itemId, itemResponse] of Object.entries(session.itemResponses)) {
    await api.patch(
      `/sessions/${session.id}/items/${encodeURIComponent(itemId)}`,
      itemResponse,
    );
  }

  await api.patch(`/sessions/${session.id}/notes`, {
    sessionNotes: session.sessionNotes,
  });

  if (session.isComplete) {
    await api.post(`/sessions/${session.id}/complete`, {
      confirmLowCoverage: true,
    });
  }
}

async function pushSessions(): Promise<{ pushed: number; errors: string[] }> {
  const localSessions = Object.values(useSessionStore.getState().sessions);
  let pushed = 0;
  const errors: string[] = [];

  for (const session of localSessions) {
    try {
      // Try to get remote version
      try {
        const remote = await api.get<{ updatedAt: string }>(
          `/sessions/${session.id}`,
        );
        // If local is newer, push update
        if (new Date(session.updatedAt) > new Date(remote.updatedAt)) {
          await pushSessionSnapshot(session);
          pushed++;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // Session doesn't exist remotely — create it
          await api.post('/sessions', {
            id: session.id,
            mode: session.mode,
            stackId: session.stackId,
            stackIds: session.stackIds,
            selectedSections: session.selectedSections,
            title: session.title,
          });
          await pushSessionSnapshot(session);
          pushed++;
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      errors.push(`Session ${session.id}: ${err.message}`);
    }
  }

  return { pushed, errors };
}

async function pullSessions(): Promise<{ pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pulled = 0;

  try {
    const remoteSessions: Session[] = [];
    let cursor: string | null = null;

    do {
      const requestPath: string = cursor
        ? `/sessions?limit=100&cursor=${encodeURIComponent(cursor)}`
        : '/sessions?limit=100';
      const response: SessionListResponse = await api.get<SessionListResponse>(
        requestPath,
      );
      remoteSessions.push(...response.items);
      cursor = response.nextCursor;
    } while (cursor);

    const localSessions = useSessionStore.getState().sessions;

    for (const remote of remoteSessions) {
      const local = localSessions[remote.id];
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        // Remote is newer or doesn't exist locally — adopt it
        useSessionStore.setState((state) => ({
          sessions: { ...state.sessions, [remote.id]: remote },
        }));
        pulled++;
      }
    }
  } catch (err: any) {
    errors.push(`Pull sessions: ${err.message}`);
  }

  return { pulled, errors };
}

async function syncPreferences(): Promise<void> {
  try {
    const remote = await api.get<{
      aiModel: string;
      defaultSeverityFilter: string[];
      antiBiasMode: boolean;
      fontSize: string;
      codeBlockTheme: string;
      autoExportPdf: boolean;
    }>('/me/preferences');

    usePreferencesStore.getState().replacePreferences({
      aiModel: remote.aiModel as any,
      defaultSeverityFilter: remote.defaultSeverityFilter as any,
      antiBiasMode: remote.antiBiasMode,
      fontSize: remote.fontSize as any,
      codeBlockTheme: remote.codeBlockTheme as any,
      autoExportPdf: remote.autoExportPdf,
    });
  } catch {
    // If preferences don't exist remotely, push local
    const local = usePreferencesStore.getState();
    await api.patch('/me/preferences', {
      aiModel: local.aiModel,
      defaultSeverityFilter: local.defaultSeverityFilter,
      antiBiasMode: local.antiBiasMode,
      fontSize: local.fontSize,
      codeBlockTheme: local.codeBlockTheme,
      autoExportPdf: local.autoExportPdf,
    }).catch(() => {});
  }
}

async function syncConfidence(): Promise<void> {
  try {
    const remoteGaps = await api.get<
      Array<{
        itemId: string;
        stackId: string;
        sectionId: string;
        severity: string;
        currentConfidence: number;
        averageConfidence: number;
        trend: string;
        learningPriority: number;
        ratings: any[];
        repetitionState?: any;
      }>
    >('/gaps');

    const localHistories = useConfidenceStore.getState().histories;
    const merged = { ...localHistories };

    for (const remote of remoteGaps) {
      const local = merged[remote.itemId];
      if (!local || remote.ratings.length > local.ratings.length) {
        merged[remote.itemId] = remote as any;
      }
    }

    useConfidenceStore.getState().replaceHistories(merged);
  } catch {
    // Gaps endpoint may not return full history — skip on error
  }
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
    // Push local changes first
    const pushResult = await pushSessions();
    totalPushed += pushResult.pushed;
    allErrors.push(...pushResult.errors);

    // Pull remote changes
    const pullResult = await pullSessions();
    totalPulled += pullResult.pulled;
    allErrors.push(...pullResult.errors);

    // Sync preferences and confidence
    await syncPreferences();
    await syncConfidence();

    if (allErrors.length > 0) {
      syncStore.markSyncFailure(allErrors.slice(0, 3).join(' | '));
    } else {
      const version = new Date().toISOString();
      syncStore.markSyncSuccess(version);
    }
  } catch (err: any) {
    allErrors.push(err.message);
    syncStore.markSyncFailure(err.message);
  }

  return { pushed: totalPushed, pulled: totalPulled, errors: allErrors };
}
