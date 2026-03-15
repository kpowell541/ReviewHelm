import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authSubject: text('auth_subject').notNull().unique(),
  email: text('email'),
  displayName: text('display_name'),
  tier: text('tier').notNull().default('free'),
  creditBalanceUsd: numeric('credit_balance_usd', { precision: 10, scale: 4 }).notNull().default('0'),
  billingCycleStart: timestamp('billing_cycle_start', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
