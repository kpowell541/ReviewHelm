import { api, ApiError } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import type { Session } from '../data/types';
import type { AdapterResult } from './types';

interface SessionListResponse {
  items: Session[];
  nextCursor: string | null;
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

export async function syncSessions(): Promise<AdapterResult> {
  let pushed = 0;
  let pulled = 0;
  const errors: string[] = [];

  // --- Push ---
  const localSessions = Object.values(useSessionStore.getState().sessions);

  for (const session of localSessions) {
    try {
      try {
        const remote = await api.get<{ updatedAt: string }>(
          `/sessions/${session.id}`,
        );
        if (new Date(session.updatedAt) > new Date(remote.updatedAt)) {
          await pushSessionSnapshot(session);
          pushed++;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          const isPolish = session.mode === 'polish';
          await api.post('/sessions', {
            id: session.id,
            mode: session.mode,
            stackId: isPolish ? undefined : session.stackId,
            stackIds: isPolish ? [] : session.stackIds,
            selectedSections: session.selectedSections,
            title: session.title,
          });
          await pushSessionSnapshot(session);
          pushed++;
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Delete ---
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

  // --- Pull ---
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

    const sessionState = useSessionStore.getState();
    const localSessionMap = sessionState.sessions;
    const deletedIds = new Set(sessionState.deletedSessionIds ?? []);

    for (const remote of remoteSessions) {
      if (deletedIds.has(remote.id)) continue;
      const local = localSessionMap[remote.id];
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        useSessionStore.setState((state) => ({
          sessions: { ...state.sessions, [remote.id]: remote },
        }));
        pulled++;
      }
    }
  } catch (err: unknown) {
    errors.push(`Pull sessions: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors, label: 'Sessions' };
}
