import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  aiModel: text('ai_model').notNull().default('sonnet'),
  defaultSeverityFilter: text('default_severity_filter').array().notNull().default(['blocker', 'major', 'minor', 'nit']),
  antiBiasMode: integer('anti_bias_mode').notNull().default(1),
  fontSize: text('font_size').notNull().default('medium'),
  codeBlockTheme: text('code_block_theme').notNull().default('dark'),
  autoExportPdf: integer('auto_export_pdf').notNull().default(0),
  activeCommentStyleProfileId: text('active_comment_style_profile_id'),
  monthlyBudgetUsd: numeric('monthly_budget_usd', { precision: 10, scale: 2 }).notNull().default('40'),
  alertThresholds: integer('alert_thresholds').array().notNull().default([70, 85, 95]),
  hardStopAtBudget: integer('hard_stop_at_budget').notNull().default(0),
  autoDowngradeNearBudget: integer('auto_downgrade_near_budget').notNull().default(1),
  autoDowngradeThresholdPct: integer('auto_downgrade_threshold_pct').notNull().default(85),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(6),
  lastAlertThreshold: integer('last_alert_threshold'),
  bookmarks: jsonb('bookmarks').notNull().default([]),
  templates: jsonb('templates').notNull().default({}),
  repoConfigs: jsonb('repo_configs').notNull().default({}),
  confidenceHistories: jsonb('confidence_histories').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
