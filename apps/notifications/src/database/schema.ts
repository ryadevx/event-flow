import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
} from 'drizzle-orm/pg-core';

export const inboxEvents = pgTable('inbox_events', {
  id: uuid('id').primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  lastError: text('last_error'),
});
