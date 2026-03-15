import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getDb } from '../db/client';
import { trackedPrs } from '../db/schema';
import { upsertUserFromPrincipal } from '../me/repository';
import type { UpsertTrackedPrInput } from './schema';

function toResponse(row: typeof trackedPrs.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    status: row.status,
    role: row.role,
    priority: row.priority,
    isEmergency: row.isEmergency,
    size: row.size,
    repo: row.repo,
    prNumber: row.prNumber,
    prAuthor: row.prAuthor,
    dependencies: row.dependencies,
    ciPassing: row.ciPassing,
    linkedSessionId: row.linkedSessionId,
    notes: row.notes,
    acceptanceOutcome: row.acceptanceOutcome,
    reviewOutcome: row.reviewOutcome,
    selfReviewed: row.selfReviewed,
    reviewRoundCount: row.reviewRoundCount,
    changesEverNeeded: row.changesEverNeeded,
    reReviewed: row.reReviewed,
    missCategory: row.missCategory,
    missNote: row.missNote,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTrackedPrs(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const rows = await db
    .select()
    .from(trackedPrs)
    .where(eq(trackedPrs.userId, user.id))
    .orderBy(desc(trackedPrs.updatedAt));
  return rows.map(toResponse);
}

export async function getTrackedPr(principal: AuthPrincipal, prId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const row = await db.query.trackedPrs.findFirst({
    where: and(eq(trackedPrs.id, prId), eq(trackedPrs.userId, user.id)),
  });
  if (!row) throw new HTTPException(404, { message: 'PR not found.' });
  return toResponse(row);
}

export async function upsertTrackedPr(principal: AuthPrincipal, input: UpsertTrackedPrInput) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const existing = await db.query.trackedPrs.findFirst({
    where: eq(trackedPrs.id, input.id),
  });

  if (existing && existing.userId !== user.id) {
    throw new HTTPException(403, { message: 'PR belongs to another user.' });
  }

  const data = {
    id: input.id,
    userId: user.id,
    title: input.title,
    url: input.url ?? null,
    status: input.status,
    role: input.role,
    priority: input.priority,
    isEmergency: input.isEmergency,
    size: input.size ?? null,
    repo: input.repo ?? null,
    prNumber: input.prNumber ?? null,
    prAuthor: input.prAuthor ?? null,
    dependencies: input.dependencies ?? [],
    ciPassing: input.ciPassing ?? null,
    linkedSessionId: input.linkedSessionId ?? null,
    notes: input.notes ?? null,
    acceptanceOutcome: input.acceptanceOutcome ?? null,
    reviewOutcome: input.reviewOutcome ?? null,
    selfReviewed: input.selfReviewed ?? null,
    reviewRoundCount: input.reviewRoundCount ?? 0,
    changesEverNeeded: input.changesEverNeeded ?? null,
    reReviewed: input.reReviewed ?? null,
    missCategory: input.missCategory ?? null,
    missNote: input.missNote ?? null,
    resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
    lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : null,
    archivedAt: input.archivedAt ? new Date(input.archivedAt) : null,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
  };

  const [row] = existing
    ? await db
        .update(trackedPrs)
        .set(data)
        .where(eq(trackedPrs.id, input.id))
        .returning()
    : await db.insert(trackedPrs).values(data).returning();

  return toResponse(row);
}

export async function deleteTrackedPr(principal: AuthPrincipal, prId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const row = await db.query.trackedPrs.findFirst({
    where: and(eq(trackedPrs.id, prId), eq(trackedPrs.userId, user.id)),
  });
  if (!row) throw new HTTPException(404, { message: 'PR not found.' });
  await db.delete(trackedPrs).where(eq(trackedPrs.id, prId));
}
