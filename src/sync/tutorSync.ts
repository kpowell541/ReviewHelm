import { api } from '../api/client';
import { useTutorStore } from '../store/useTutorStore';
import type { TutorConversation } from '../data/types';
import type { ApiTutorConversation } from '../api/schema';
import type { AdapterResult } from './types';
import { mergeTutorConversation } from '../utils/tutorConversation';

export async function syncTutorConversations(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const remote = await api.get<ApiTutorConversation[]>('/tutor-conversations');

    const localConversations = useTutorStore.getState().conversations;
    const merged = { ...localConversations };
    const remoteByItemId = new Map(remote.map((conv) => [conv.itemId, conv]));
    const allItemIds = new Set([
      ...Object.keys(localConversations),
      ...remote.map((conv) => conv.itemId),
    ]);

    for (const itemId of allItemIds) {
      const local = localConversations[itemId];
      const remoteConversation = remoteByItemId.get(itemId);
      const remoteValue = remoteConversation
        ? {
            itemId: remoteConversation.itemId,
            messages:
              remoteConversation.messages as unknown as TutorConversation['messages'],
            lastAccessed: remoteConversation.lastAccessed,
          }
        : undefined;

      const mergedConversation = mergeTutorConversation(local, remoteValue);
      if (!mergedConversation) continue;

      merged[itemId] = mergedConversation;
      if (!local && remoteValue) {
        pulled++;
        continue;
      }
      if (
        local &&
        mergedConversation.messages.length > local.messages.length
      ) {
        pulled++;
      }
    }

    const toPush: Array<{ itemId: string; messages: unknown[]; lastAccessed: string }> = [];

    for (const local of Object.values(merged)) {
      const remoteConversation = remoteByItemId.get(local.itemId);
      const remoteMessageCount = remoteConversation?.messages?.length ?? 0;
      if (
        !remoteConversation ||
        local.messages.length > remoteMessageCount ||
        new Date(local.lastAccessed) > new Date(remoteConversation.lastAccessed)
      ) {
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
