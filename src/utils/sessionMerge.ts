import type { ItemResponse, Session } from '../data/types';

function compareDates(a?: string, b?: string): number {
  return new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();
}

function maxDate(a?: string, b?: string): string {
  return compareDates(a, b) >= 0 ? (a ?? b ?? new Date(0).toISOString()) : (b ?? a ?? new Date(0).toISOString());
}

function minDefinedDate(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) <= 0 ? a : b;
}

function mergeStringArrays(
  preferred?: string[],
  other?: string[],
): string[] | undefined {
  const merged: string[] = [];
  for (const value of preferred ?? []) {
    if (!merged.includes(value)) merged.push(value);
  }
  for (const value of other ?? []) {
    if (!merged.includes(value)) merged.push(value);
  }
  return merged.length > 0 ? merged : undefined;
}

function mergeText(preferred: string | undefined, fallback: string | undefined): string {
  if (preferred && preferred.trim().length > 0) return preferred;
  return fallback ?? '';
}

function mergeItemResponses(
  preferred: Record<string, ItemResponse>,
  other: Record<string, ItemResponse>,
): Record<string, ItemResponse> {
  const merged: Record<string, ItemResponse> = {};
  const itemIds = new Set([...Object.keys(other), ...Object.keys(preferred)]);

  for (const itemId of itemIds) {
    const preferredResponse = preferred[itemId];
    const otherResponse = other[itemId];

    if (preferredResponse && otherResponse) {
      merged[itemId] = {
        ...otherResponse,
        ...preferredResponse,
      };
    } else {
      merged[itemId] = preferredResponse ?? otherResponse;
    }
  }

  return merged;
}

function normalizeItemResponses(
  responses: Record<string, ItemResponse>,
): Record<string, ItemResponse> {
  return Object.fromEntries(
    Object.keys(responses)
      .sort()
      .map((itemId) => [
        itemId,
        {
          verdict: responses[itemId].verdict,
          confidence: responses[itemId].confidence,
          notes: responses[itemId].notes,
          draftedComment: responses[itemId].draftedComment,
        },
      ]),
  );
}

export function mergeSession(
  local?: Session,
  remote?: Session,
): Session | undefined {
  if (!local && !remote) return undefined;
  const newer =
    compareDates(local?.updatedAt, remote?.updatedAt) >= 0
      ? local ?? remote
      : remote ?? local;
  const older = newer === local ? remote : local;
  if (!newer) return older;
  if (!older) return newer;

  return {
    ...older,
    ...newer,
    id: newer.id,
    mode: newer.mode,
    stackId: newer.stackId ?? older.stackId,
    stackIds: mergeStringArrays(newer.stackIds, older.stackIds) as Session['stackIds'],
    selectedSections: mergeStringArrays(
      newer.selectedSections,
      older.selectedSections,
    ),
    title: mergeText(newer.title, older.title),
    itemResponses: mergeItemResponses(newer.itemResponses, older.itemResponses),
    sessionNotes: mergeText(newer.sessionNotes, older.sessionNotes),
    linkedPRId:
      newer.linkedPRId !== undefined ? newer.linkedPRId : older.linkedPRId,
    createdAt: minDefinedDate(local?.createdAt, remote?.createdAt) ?? newer.createdAt,
    updatedAt: maxDate(local?.updatedAt, remote?.updatedAt),
    completedAt: minDefinedDate(local?.completedAt, remote?.completedAt),
    isComplete: Boolean(local?.isComplete || remote?.isComplete),
  };
}

export function serializeSession(session: Session): string {
  return JSON.stringify({
    id: session.id,
    mode: session.mode,
    stackId: session.stackId,
    stackIds: session.stackIds ?? [],
    selectedSections: session.selectedSections ?? [],
    title: session.title,
    itemResponses: normalizeItemResponses(session.itemResponses),
    sessionNotes: session.sessionNotes,
    linkedPRId: session.linkedPRId ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt ?? null,
    isComplete: session.isComplete,
  });
}
