import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'),
  actorType: text('actor_type').notNull(),
  action: text('action').notNull(),
  statusCode: integer('status_code'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
