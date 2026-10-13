import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 255 }).notNull(),

  description: text('description'),

  location: varchar('location', { length: 255 }).notNull(),

  startsAt: timestamp('starts_at').notNull(),

  capacity: integer('capacity').notNull(),

  createdBy: uuid('created_by').notNull(),

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
