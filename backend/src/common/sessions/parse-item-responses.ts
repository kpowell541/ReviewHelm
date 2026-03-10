import { Prisma } from '@prisma/client';
import type { SessionItemResponse } from '../../sessions/sessions.types';

export function parseSessionItemResponses(
  value: Prisma.JsonValue | unknown,
): Record<string, SessionItemResponse> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const out: Record<string, SessionItemResponse> = {};

  for (const [itemId, payload] of Object.entries(raw)) {
    if (!payload || typeof payload !== 'object') continue;
    const row = payload as Record<string, unknown>;
    const verdict = row.verdict;
    const confidence = Number(row.confidence ?? 0);

    if (
      (verdict !== 'looks-good' &&
        verdict !== 'needs-attention' &&
        verdict !== 'na' &&
        verdict !== 'skipped') ||
      ![1, 2, 3, 4, 5].includes(confidence)
    ) {
      continue;
    }

    out[itemId] = {
      verdict,
      confidence: confidence as 1 | 2 | 3 | 4 | 5,
      notes: typeof row.notes === 'string' ? row.notes : undefined,
      draftedComment:
        typeof row.draftedComment === 'string' ? row.draftedComment : undefined,
    };
  }

  return out;
}
