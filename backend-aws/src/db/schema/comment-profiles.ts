import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const commentProfiles = pgTable('comment_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tone: text('tone').notNull(),
  strictness: integer('strictness').notNull().default(3),
  verbosity: integer('verbosity').notNull().default(3),
  includePraise: boolean('include_praise').notNull().default(false),
  includeActionItems: boolean('include_action_items').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
