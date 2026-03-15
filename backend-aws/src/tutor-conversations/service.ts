import { and, desc, eq } from 'drizzle-orm';
import type { AuthPrincipal } from '../auth/types';
import { getDb } from '../db/client';
import { tutorConversations } from '../db/schema';
import { upsertUserFromPrincipal } from '../me/repository';

function toResponse(row: typeof tutorConversations.$inferSelect) {
  return {
    itemId: row.itemId,
    messages: row.messages,
    lastAccessed: row.lastAccessed.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTutorConversations(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const rows = await db
    .select()
    .from(tutorConversations)
    .where(eq(tutorConversations.userId, user.id))
    .orderBy(desc(tutorConversations.lastAccessed));
  return rows.map(toResponse);
}

export async function upsertTutorConversation(
  principal: AuthPrincipal,
  input: { itemId: string; messages: unknown[]; lastAccessed: string },
) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const existing = await db.query.tutorConversations.findFirst({
    where: and(eq(tutorConversations.userId, user.id), eq(tutorConversations.itemId, input.itemId)),
  });

  const [row] = existing
    ? await db
        .update(tutorConversations)
        .set({
          messages: input.messages,
          lastAccessed: new Date(input.lastAccessed),
          updatedAt: new Date(),
        })
        .where(eq(tutorConversations.id, existing.id))
        .returning()
    : await db
        .insert(tutorConversations)
        .values({
          userId: user.id,
          itemId: input.itemId,
          messages: input.messages,
          lastAccessed: new Date(input.lastAccessed),
        })
        .returning();

  return toResponse(row);
}

export async function bulkUpsertTutorConversations(
  principal: AuthPrincipal,
  conversations: Array<{ itemId: string; messages: unknown[]; lastAccessed: string }>,
) {
  const results = [];
  for (const conversation of conversations) {
    results.push(await upsertTutorConversation(principal, conversation));
  }
  return results;
}

export async function deleteTutorConversation(principal: AuthPrincipal, itemId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  await db
    .delete(tutorConversations)
    .where(and(eq(tutorConversations.userId, user.id), eq(tutorConversations.itemId, itemId)));
}
