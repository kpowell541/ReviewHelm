import { api } from '../api/client';
import { useTutorStore } from '../store/useTutorStore';
import type { TutorConversation } from '../data/types';
import type { ApiTutorConversation } from '../api/schema';
import type { AdapterResult } from './types';

export async function syncTutorConversations(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const remote = await api.get<ApiTutorConversation[]>('/tutor-conversations');

    const localConversations = useTutorStore.getState().conversations;
    const merged = { ...localConversations };

    for (const conv of remote) {
      const local = merged[conv.itemId];
      if (!local || new Date(conv.lastAccessed) > new Date(local.lastAccessed)) {
        merged[conv.itemId] = {
          itemId: conv.itemId,
          messages: conv.messages as unknown as TutorConversation['messages'],
          lastAccessed: conv.lastAccessed,
        };
        pulled++;
      }
    }

    const remoteByItemId = new Map(remote.map((c) => [c.itemId, c]));
    const toPush: Array<{ itemId: string; messages: unknown[]; lastAccessed: string }> = [];

    for (const local of Object.values(localConversations)) {
      const r = remoteByItemId.get(local.itemId);
      if (!r || new Date(local.lastAccessed) > new Date(r.lastAccessed)) {
        toPush.push({
          itemId: local.itemId,
          messages: local.messages,
          lastAccessed: local.lastAccessed,
        });
      }
    }

    if (toPush.length > 0) {
      try {
        await api.put('/tutor-conversations', { conversations: toPush });
        pushed += toPush.length;
      } catch (err: unknown) {
        errors.push(`Push conversations: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    useTutorStore.getState().replaceConversations(merged);
  } catch (err: unknown) {
    errors.push(`Sync conversations: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors, label: 'Tutor' };
}
