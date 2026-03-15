import { and, asc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getDb } from '../db/client';
import { commentProfiles, preferences } from '../db/schema';
import { getOrCreatePreferences, upsertUserFromPrincipal } from '../me/repository';
import type { CreateCommentProfileInput, UpdateCommentProfileInput } from './schema';

function toResponse(row: typeof commentProfiles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    tone: row.tone,
    strictness: row.strictness,
    verbosity: row.verbosity,
    includePraise: row.includePraise,
    includeActionItems: row.includeActionItems,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCommentProfiles(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const [profiles, preference] = await Promise.all([
    db
      .select()
      .from(commentProfiles)
      .where(eq(commentProfiles.userId, user.id))
      .orderBy(asc(commentProfiles.createdAt)),
    getOrCreatePreferences(user.id),
  ]);

  return {
    activeProfileId: preference.activeCommentStyleProfileId,
    items: profiles.map(toResponse),
  };
}

export async function createCommentProfile(principal: AuthPrincipal, input: CreateCommentProfileInput) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const [created] = await db
    .insert(commentProfiles)
    .values({
      userId: user.id,
      name: input.name.trim(),
      tone: input.tone.trim(),
      strictness: input.strictness,
      verbosity: input.verbosity,
      includePraise: input.includePraise ?? false,
      includeActionItems: input.includeActionItems ?? true,
    })
    .returning();

  return toResponse(created);
}

export async function updateCommentProfile(
  principal: AuthPrincipal,
  profileId: string,
  input: UpdateCommentProfileInput,
) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const existing = await db.query.commentProfiles.findFirst({
    where: and(eq(commentProfiles.id, profileId), eq(commentProfiles.userId, user.id)),
  });
  if (!existing) {
    throw new HTTPException(404, { message: 'Comment profile not found.' });
  }

  const [updated] = await db
    .update(commentProfiles)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.tone !== undefined ? { tone: input.tone.trim() } : {}),
      ...(input.strictness !== undefined ? { strictness: input.strictness } : {}),
      ...(input.verbosity !== undefined ? { verbosity: input.verbosity } : {}),
      ...(input.includePraise !== undefined ? { includePraise: input.includePraise } : {}),
      ...(input.includeActionItems !== undefined ? { includeActionItems: input.includeActionItems } : {}),
      updatedAt: new Date(),
    })
    .where(eq(commentProfiles.id, profileId))
    .returning();

  return toResponse(updated);
}

export async function deleteCommentProfile(principal: AuthPrincipal, profileId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const existing = await db.query.commentProfiles.findFirst({
    where: and(eq(commentProfiles.id, profileId), eq(commentProfiles.userId, user.id)),
  });
  if (!existing) {
    throw new HTTPException(404, { message: 'Comment profile not found.' });
  }

  await db.delete(commentProfiles).where(eq(commentProfiles.id, profileId));
  await db
    .update(preferences)
    .set({
      activeCommentStyleProfileId: null,
      updatedAt: new Date(),
    })
    .where(and(eq(preferences.userId, user.id), eq(preferences.activeCommentStyleProfileId, profileId)));
}

export async function activateCommentProfile(principal: AuthPrincipal, profileId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const existing = await db.query.commentProfiles.findFirst({
    where: and(eq(commentProfiles.id, profileId), eq(commentProfiles.userId, user.id)),
  });
  if (!existing) {
    throw new HTTPException(404, { message: 'Comment profile not found.' });
  }

  await getOrCreatePreferences(user.id);
  await db
    .update(preferences)
    .set({
      activeCommentStyleProfileId: profileId,
      updatedAt: new Date(),
    })
    .where(eq(preferences.userId, user.id));

  return {
    activeProfileId: profileId,
  };
}
