import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: varchar('email', { length: 255 }).notNull().unique(),

  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  role: varchar('role', { length: 20 }).notNull().default('CUSTOMER'),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),

  type: varchar('type', { length: 100 }).notNull(),

  aggregateId: uuid('aggregate_id').notNull(),

  payload: text('payload').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  publishedAt: timestamp('published_at'),
}, (table) => ({
  publishedAtIdx: index('idx_outbox_events_published_at').on(table.publishedAt),
}));
