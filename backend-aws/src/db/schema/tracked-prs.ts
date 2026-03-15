import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const trackedPrs = pgTable('tracked_prs', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url'),
  status: text('status').notNull().default('needs-review'),
  role: text('role').notNull().default('reviewer'),
  priority: text('priority').notNull().default('medium'),
  isEmergency: boolean('is_emergency').notNull().default(false),
  size: text('size'),
  repo: text('repo'),
  prNumber: integer('pr_number'),
  prAuthor: text('pr_author'),
  dependencies: jsonb('dependencies').notNull().default([]),
  ciPassing: text('ci_passing'),
  linkedSessionId: uuid('linked_session_id'),
  notes: text('notes'),
  acceptanceOutcome: text('acceptance_outcome'),
  reviewOutcome: text('review_outcome'),
  selfReviewed: boolean('self_reviewed'),
  reviewRoundCount: integer('review_round_count').notNull().default(0),
  changesEverNeeded: boolean('changes_ever_needed'),
  reReviewed: boolean('re_reviewed'),
  missCategory: text('miss_category'),
  missNote: text('miss_note'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
