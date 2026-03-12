import type { TutorConversation, TutorMessage } from '../data/types';

function compareMessages(a: TutorMessage, b: TutorMessage): number {
  const timeDiff =
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  if (timeDiff !== 0) return timeDiff;
  return `${a.role}:${a.content}`.localeCompare(`${b.role}:${b.content}`);
}

function getMessageKey(message: TutorMessage): string {
  return [message.timestamp, message.role, message.content].join('|');
}

export function mergeTutorConversation(
  local?: TutorConversation,
  remote?: TutorConversation,
): TutorConversation | undefined {
  if (!local && !remote) return undefined;
  const base = local ?? remote;
  if (!base) return undefined;

  const mergedMessages = new Map<string, TutorMessage>();
  for (const message of local?.messages ?? []) {
    mergedMessages.set(getMessageKey(message), message);
  }
  for (const message of remote?.messages ?? []) {
    mergedMessages.set(getMessageKey(message), message);
  }

  const lastAccessedCandidates = [local?.lastAccessed, remote?.lastAccessed]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    itemId: local?.itemId ?? remote?.itemId ?? base.itemId,
    messages: [...mergedMessages.values()].sort(compareMessages),
    lastAccessed: lastAccessedCandidates[0] ?? base.lastAccessed,
  };
}
