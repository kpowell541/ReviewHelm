import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  mode: text('mode').notNull(),
  stackId: text('stack_id'),
  stackIds: text('stack_ids').array().notNull().default([]),
  selectedSections: text('selected_sections').array().notNull().default([]),
  title: text('title').notNull(),
  itemResponses: jsonb('item_responses').notNull().default({}),
  sessionNotes: text('session_notes').notNull().default(''),
  linkedPRId: text('linked_pr_id'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isComplete: integer('is_complete').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
