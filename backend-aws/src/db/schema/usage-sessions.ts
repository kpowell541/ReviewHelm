import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sessions } from './sessions';
import { users } from './users';

export const usageSessions = pgTable('usage_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' })
    .unique(),
  calls: integer('calls').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  byModel: jsonb('by_model').notNull().default({}),
  byFeature: jsonb('by_feature').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
});
