import { and, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { preferences, users } from '../db/schema';
import type { AuthPrincipal } from '../auth/types';
import type { UpdatePreferencesInput } from './schema';

function toBooleanFlag(value: boolean): number {
  return value ? 1 : 0;
}

export async function upsertUserFromPrincipal(principal: AuthPrincipal) {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.authSubject, principal.subject),
  });

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: principal.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      authSubject: principal.subject,
      email: principal.email,
    })
    .returning();

  return created;
}

export async function getOrCreatePreferences(userId: string) {
  const db = getDb();
  const existing = await db.query.preferences.findFirst({
    where: eq(preferences.userId, userId),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(preferences)
    .values({ userId })
    .returning();

  return created;
}

export async function updatePreferences(userId: string, input: UpdatePreferencesInput) {
  const db = getDb();
  await getOrCreatePreferences(userId);

  const updateData: Partial<typeof preferences.$inferInsert> = {};

  if (input.aiModel !== undefined) updateData.aiModel = input.aiModel;
  if (input.defaultSeverityFilter !== undefined) {
    updateData.defaultSeverityFilter = [...new Set(input.defaultSeverityFilter)];
  }
  if (input.antiBiasMode !== undefined) updateData.antiBiasMode = toBooleanFlag(input.antiBiasMode);
  if (input.fontSize !== undefined) updateData.fontSize = input.fontSize;
  if (input.codeBlockTheme !== undefined) updateData.codeBlockTheme = input.codeBlockTheme;
  if (input.autoExportPdf !== undefined) updateData.autoExportPdf = toBooleanFlag(input.autoExportPdf);
  if (input.activeCommentStyleProfileId !== undefined) {
    updateData.activeCommentStyleProfileId = input.activeCommentStyleProfileId;
  }
  if (input.monthlyBudgetUsd !== undefined) updateData.monthlyBudgetUsd = String(input.monthlyBudgetUsd);
  if (input.alertThresholds !== undefined) {
    updateData.alertThresholds = [...new Set(input.alertThresholds)].sort((a, b) => a - b);
  }
  if (input.hardStopAtBudget !== undefined) updateData.hardStopAtBudget = toBooleanFlag(input.hardStopAtBudget);
  if (input.autoDowngradeNearBudget !== undefined) {
    updateData.autoDowngradeNearBudget = toBooleanFlag(input.autoDowngradeNearBudget);
  }
  if (input.autoDowngradeThresholdPct !== undefined) {
    updateData.autoDowngradeThresholdPct = input.autoDowngradeThresholdPct;
  }
  if (input.cooldownSeconds !== undefined) updateData.cooldownSeconds = input.cooldownSeconds;
  if (input.bookmarks !== undefined) updateData.bookmarks = input.bookmarks;
  if (input.templates !== undefined) updateData.templates = input.templates;
  if (input.repoConfigs !== undefined) updateData.repoConfigs = input.repoConfigs;

  const [updated] = await db
    .update(preferences)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(preferences.userId, userId))
    .returning();

  return updated;
}
