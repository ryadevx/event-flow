import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  capacity: integer('capacity').notNull(),
  availableTickets: integer('available_tickets').notNull(),
  soldTickets: integer('sold_tickets').notNull().default(0),
  startsAt: timestamp('starts_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull(),
  userId: uuid('user_id').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index('idx_tickets_event_id').on(table.eventId),
  userIdIdx: index('idx_tickets_user_id').on(table.userId),
}));

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  aggregateId: uuid('aggregate_id').notNull(),
  payload: text('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  aggregateIdIdx: index('idx_outbox_events_aggregate_id').on(table.aggregateId),
  publishedAtIdx: index('idx_outbox_events_published_at').on(table.publishedAt),
}));


export const inboxEvents = pgTable('inbox_events', {
  id: uuid('id').primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar('key', { length: 255 }).notNull(),
    userId: uuid('user_id').notNull(),

    // NULL while the request is being processed.
    // Filled with the ticket ID before the transaction commits.
    ticketId: uuid('ticket_id'),

    payloadHash: varchar('payload_hash', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.key, table.userId],
    }),
  }),
);
