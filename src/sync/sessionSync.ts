import { api, ApiError } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import type { Session } from '../data/types';
import type { ApiSessionListResponse } from '../api/schema';
import type { AdapterResult } from './types';
import { mergeSession, serializeSession } from '../utils/sessionMerge';

async function pushSessionSnapshot(session: Session): Promise<void> {
  await api.patch(`/sessions/${session.id}`, {
    title: session.title,
    linkedPRId: session.linkedPRId ?? null,
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

async function fetchRemoteSessions(): Promise<Session[]> {
  const remoteSessions: Session[] = [];
  let cursor: string | null = null;

  do {
    const requestPath: string = cursor
      ? `/sessions?limit=100&cursor=${encodeURIComponent(cursor)}`
      : '/sessions?limit=100';
    const response: ApiSessionListResponse = await api.get<ApiSessionListResponse>(
      requestPath,
    );
    remoteSessions.push(...(response.items as unknown as Session[]));
    cursor = response.nextCursor;
  } while (cursor);

  return remoteSessions;
}

export async function syncSessions(): Promise<AdapterResult> {
  let pushed = 0;
  let pulled = 0;
  const errors: string[] = [];

  const sessionState = useSessionStore.getState();
  const localSessionMap = sessionState.sessions;
  const deletedIds = new Set(sessionState.deletedSessionIds ?? []);

  let remoteSessions: Session[] = [];
  try {
    remoteSessions = await fetchRemoteSessions();
  } catch (err: unknown) {
    errors.push(`Pull sessions: ${err instanceof Error ? err.message : String(err)}`);
    return { pushed, pulled, errors, label: 'Sessions' };
  }

  const remoteById = new Map(remoteSessions.map((session) => [session.id, session]));
  const mergedSessions = { ...localSessionMap };

  for (const remote of remoteSessions) {
    if (deletedIds.has(remote.id)) continue;
    const local = localSessionMap[remote.id];
    const merged = mergeSession(local, remote);
    if (!merged) continue;

    mergedSessions[remote.id] = merged;
    if (!local || serializeSession(local) !== serializeSession(merged)) {
      pulled++;
    }
  }

  useSessionStore.getState().replaceSessions(mergedSessions);

  for (const session of Object.values(mergedSessions)) {
    if (deletedIds.has(session.id)) continue;

    const remote = remoteById.get(session.id);
    try {
      if (!remote) {
        const isPolish = session.mode === 'polish';
        await api.post('/sessions', {
          id: session.id,
          mode: session.mode,
          stackId: isPolish ? undefined : session.stackId,
          stackIds: isPolish ? [] : session.stackIds,
          selectedSections: session.selectedSections,
          title: session.title,
          linkedPRId: session.linkedPRId,
        });
        await pushSessionSnapshot(session);
        pushed++;
        continue;
      }

      if (serializeSession(session) !== serializeSession(remote)) {
        await pushSessionSnapshot(session);
        pushed++;
      }
    } catch (err: unknown) {
      errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const deletedSessionIds = useSessionStore.getState().deletedSessionIds ?? [];
  const successfulDeletes: string[] = [];
  for (const deletedId of deletedSessionIds) {
    try {
      await api.delete(`/sessions/${deletedId}`);
      successfulDeletes.push(deletedId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        successfulDeletes.push(deletedId);
      } else {
        errors.push(`Delete session ${deletedId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  if (successfulDeletes.length > 0) {
    useSessionStore.setState((state) => ({
      deletedSessionIds: state.deletedSessionIds.filter(
        (id) => !successfulDeletes.includes(id),
      ),
    }));
  }

  return { pushed, pulled, errors, label: 'Sessions' };
}
