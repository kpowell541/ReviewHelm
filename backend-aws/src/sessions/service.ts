import { and, count, desc, eq, lt, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getDb } from '../db/client';
import { sessions } from '../db/schema';
import { upsertUserFromPrincipal } from '../me/repository';
import { getTierInfo } from '../subscription/service';
import { getSessionUsage } from '../usage/service';
import type {
  CompleteSessionInput,
  CreateSessionInput,
  ListSessionsQuery,
  PatchItemResponseInput,
  UpdateSessionInput,
} from './schema';

type ItemResponseRecord = Record<string, unknown>;

const FREE_SESSION_LIMIT = 5;

function buildDefaultTitle(mode: 'review' | 'polish'): string {
  const date = new Date().toLocaleDateString('en-US');
  return `${mode === 'polish' ? 'Polish' : 'Review'} - ${date}`;
}

function parseItemResponses(value: unknown): ItemResponseRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ItemResponseRecord;
}

function toSessionResponse(session: typeof sessions.$inferSelect) {
  return {
    id: session.id,
    mode: session.mode,
    stackId: session.stackId,
    stackIds: session.stackIds,
    selectedSections: session.selectedSections,
    title: session.title,
    itemResponses: parseItemResponses(session.itemResponses),
    sessionNotes: session.sessionNotes,
    linkedPRId: session.linkedPRId,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    isComplete: session.isComplete === 1,
  };
}

function encodeCursor(cursor: { updatedAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({ updatedAt: cursor.updatedAt.toISOString(), id: cursor.id }), 'utf8').toString('base64url');
}

function decodeCursor(value: string | undefined): { updatedAt: Date; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      updatedAt: string;
      id: string;
    };
    return {
      updatedAt: new Date(parsed.updatedAt),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

async function getSessionForUserOrThrow(userId: string, sessionId: string) {
  const db = getDb();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  });
  if (!session) {
    throw new HTTPException(404, { message: 'Session not found.' });
  }
  return session;
}

function computeCoveragePercent(session: typeof sessions.$inferSelect): number {
  const itemResponses = parseItemResponses(session.itemResponses);
  const entries = Object.values(itemResponses);
  if (entries.length === 0) return 100;

  let answered = 0;
  let notApplicable = 0;
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') continue;
    const verdict = (raw as Record<string, unknown>).verdict;
    if (verdict === 'na') {
      notApplicable += 1;
    } else if (verdict && verdict !== 'skipped') {
      answered += 1;
    }
  }

  const applicable = Math.max(0, entries.length - notApplicable);
  if (applicable === 0) return 100;
  return Math.round((answered / applicable) * 100);
}

export async function createSession(principal: AuthPrincipal, input: CreateSessionInput) {
  const user = await upsertUserFromPrincipal(principal);
  const tierInfo = await getTierInfo(principal);

  if (tierInfo.effectiveTier === 'free') {
    const db = getDb();
    const [result] = await db
      .select({ value: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), eq(sessions.isComplete, 0)));
    if (result.value >= FREE_SESSION_LIMIT) {
      throw new HTTPException(400, {
        message: `Free accounts are limited to ${FREE_SESSION_LIMIT} active sessions. Complete or delete a session, or upgrade to Starter for unlimited sessions.`,
      });
    }
  }

  const stackIds = input.stackIds?.length ? input.stackIds : input.stackId ? [input.stackId] : [];
  if (input.mode === 'review' && stackIds.length === 0) {
    throw new HTTPException(400, { message: 'At least one stackId is required for review sessions.' });
  }
  if (input.mode === 'polish' && stackIds.length > 0) {
    throw new HTTPException(400, { message: 'stackIds must be empty for polish sessions.' });
  }

  const db = getDb();
  const [created] = await db
    .insert(sessions)
    .values({
      id: input.id,
      userId: user.id,
      mode: input.mode,
      stackId: stackIds[0] ?? null,
      stackIds,
      selectedSections: input.selectedSections ?? [],
      title: input.title?.trim() || buildDefaultTitle(input.mode),
      linkedPRId: input.linkedPRId ?? null,
      itemResponses: {},
    })
    .returning();

  return toSessionResponse(created);
}

export async function listSessions(principal: AuthPrincipal, query: ListSessionsQuery) {
  const user = await upsertUserFromPrincipal(principal);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const cursor = decodeCursor(query.cursor);

  const filters = [eq(sessions.userId, user.id)];
  if (query.mode) filters.push(eq(sessions.mode, query.mode));
  if (query.stackId) filters.push(eq(sessions.stackId, query.stackId));
  if (query.status === 'active') filters.push(eq(sessions.isComplete, 0));
  if (query.status === 'completed') filters.push(eq(sessions.isComplete, 1));

  const where = cursor
    ? and(
        ...filters,
        or(
          lt(sessions.updatedAt, cursor.updatedAt),
          and(eq(sessions.updatedAt, cursor.updatedAt), lt(sessions.id, cursor.id)),
        ),
      )
    : and(...filters);

  const db = getDb();
  const rows = await db
    .select()
    .from(sessions)
    .where(where)
    .orderBy(desc(sessions.updatedAt), desc(sessions.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toSessionResponse);
  const next = hasMore ? rows[limit - 1] : null;

  return {
    items,
    nextCursor: next ? encodeCursor({ updatedAt: next.updatedAt, id: next.id }) : null,
  };
}

export async function getSessionById(principal: AuthPrincipal, sessionId: string) {
  const user = await upsertUserFromPrincipal(principal);
  return toSessionResponse(await getSessionForUserOrThrow(user.id, sessionId));
}

export async function updateSession(principal: AuthPrincipal, sessionId: string, input: UpdateSessionInput) {
  const user = await upsertUserFromPrincipal(principal);
  await getSessionForUserOrThrow(user.id, sessionId);

  const db = getDb();
  const [updated] = await db
    .update(sessions)
    .set({
      title: input.title.trim(),
      linkedPRId: input.linkedPRId,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return toSessionResponse(updated);
}

export async function deleteSession(principal: AuthPrincipal, sessionId: string) {
  const user = await upsertUserFromPrincipal(principal);
  await getSessionForUserOrThrow(user.id, sessionId);

  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function patchItemResponse(
  principal: AuthPrincipal,
  sessionId: string,
  itemId: string,
  input: PatchItemResponseInput,
) {
  const user = await upsertUserFromPrincipal(principal);
  const session = await getSessionForUserOrThrow(user.id, sessionId);
  const current = parseItemResponses(session.itemResponses);
  const existing = (current[itemId] ?? { verdict: 'skipped', confidence: 3 }) as Record<string, unknown>;
  const merged = { ...existing, ...input };
  current[itemId] = merged;

  const db = getDb();
  await db
    .update(sessions)
    .set({
      itemResponses: current,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  return merged;
}

export async function patchSessionNotes(principal: AuthPrincipal, sessionId: string, sessionNotes: string) {
  const user = await upsertUserFromPrincipal(principal);
  await getSessionForUserOrThrow(user.id, sessionId);

  const db = getDb();
  const [updated] = await db
    .update(sessions)
    .set({
      sessionNotes,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return {
    sessionId: updated.id,
    sessionNotes: updated.sessionNotes,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function completeSession(principal: AuthPrincipal, sessionId: string, input: CompleteSessionInput) {
  const user = await upsertUserFromPrincipal(principal);
  const existing = await getSessionForUserOrThrow(user.id, sessionId);
  if (existing.isComplete === 1 && existing.completedAt) {
    return {
      sessionId: existing.id,
      completedAt: existing.completedAt.toISOString(),
      isComplete: true,
    };
  }

  const coverage = computeCoveragePercent(existing);
  if (coverage < 50 && !input.confirmLowCoverage) {
    throw new HTTPException(400, {
      message: 'Coverage is below 50%. Retry with confirmLowCoverage=true to complete anyway.',
    });
  }

  const completedAt = new Date();
  const db = getDb();
  const [updated] = await db
    .update(sessions)
    .set({
      isComplete: 1,
      completedAt,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, existing.id))
    .returning();

  return {
    sessionId: updated.id,
    completedAt: (updated.completedAt ?? completedAt).toISOString(),
    isComplete: updated.isComplete === 1,
  };
}

export async function getSessionSummary(principal: AuthPrincipal, sessionId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const session = await getSessionForUserOrThrow(user.id, sessionId);
  const itemResponses = parseItemResponses(session.itemResponses);

  const issuesBySeverity = {
    blocker: 0,
    major: 0,
    minor: 0,
    nit: 0,
  };

  let itemsResponded = 0;
  let confidenceTotal = 0;
  let applicableItems = 0;

  const lowConfidenceItems = Object.entries(itemResponses)
    .map(([itemId, raw]) => ({ itemId, raw }))
    .filter((entry) => entry.raw && typeof entry.raw === 'object')
    .map(({ itemId, raw }) => {
      const response = raw as Record<string, unknown>;
      const verdict = typeof response.verdict === 'string' ? response.verdict : 'skipped';
      const confidence = typeof response.confidence === 'number' ? response.confidence : 3;
      const severity = typeof response.severity === 'string'
        && ['blocker', 'major', 'minor', 'nit'].includes(response.severity)
        ? response.severity
        : 'minor';

      if (verdict !== 'na') {
        applicableItems += 1;
      }
      if (verdict !== 'na' && verdict !== 'skipped') {
        itemsResponded += 1;
        confidenceTotal += confidence;
      }
      if (verdict === 'needs-attention') {
        issuesBySeverity[severity as keyof typeof issuesBySeverity] += 1;
      }

      return {
        itemId,
        text: typeof response.text === 'string' ? response.text : itemId,
        severity,
        sectionId: typeof response.sectionId === 'string' ? response.sectionId : 'unknown',
        confidence,
        verdict,
      };
    })
    .filter((item) => item.confidence <= 2 && item.verdict !== 'na')
    .sort((a, b) => a.confidence - b.confidence);

  const totalIssues = Object.values(issuesBySeverity).reduce((sum, value) => sum + value, 0);
  const coverage = applicableItems > 0 ? Math.round((itemsResponded / applicableItems) * 100) : 0;
  const confidence = itemsResponded > 0 ? Math.round((confidenceTotal / itemsResponded / 5) * 100) : 0;

  return {
    scores: {
      coverage,
      confidence,
      issuesBySeverity,
      totalIssues,
      itemsResponded,
      applicableItems,
    },
    lowConfidenceItems,
    sessionUsage: await getSessionUsage(principal, sessionId),
  };
}
