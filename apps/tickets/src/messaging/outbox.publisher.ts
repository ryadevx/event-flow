import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db } from '../database/database';
import { outboxEvents } from '../database/schema';
import { KafkaService } from './kafka.service';

@Injectable()
export class OutboxPublisher implements OnApplicationBootstrap {
  private isPublishing = false;

  constructor(private readonly kafkaService: KafkaService) {}

  async onApplicationBootstrap() {
    await this.publishPendingEvents();
    this.scheduleNextPoll();
  }

  private scheduleNextPoll() {
    setTimeout(async () => {
      await this.publishPendingEvents();
      this.scheduleNextPoll();
    }, 2000);
  }

  private async publishPendingEvents() {
    if (this.isPublishing) {
      console.log('Previous publish still running, skipping...');
      return;
    }

    this.isPublishing = true;

    try {
      const eventsToPublish = await db.transaction(async (tx) => {
        const pendingEvents = await tx.execute(sql`
          SELECT *
          FROM outbox_events
          WHERE published_at IS NULL
          ORDER BY created_at
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        `);

        const rows = pendingEvents.rows as typeof outboxEvents.$inferSelect[];

        for (const event of rows) {
          await tx
            .update(outboxEvents)
            .set({
              publishedAt: new Date(),
            })
            .where(eq(outboxEvents.id, event.id));
        }

        return rows;
      });

      for (const event of eventsToPublish) {
        const aggregateId = (event as any).aggregate_id ?? event.aggregateId;
        try {
          await this.kafkaService.publish(
            event.type,
            {
              id: event.id,
              aggregateId,
              payload: JSON.parse(event.payload),
            },
            aggregateId,
          );

          console.log(
            `Published outbox event: ${event.type} (${event.id})`,
          );
        } catch (error) {
          await db
            .update(outboxEvents)
            .set({
              publishedAt: null,
            })
            .where(eq(outboxEvents.id, event.id));

          console.error(
            `Failed to publish outbox event ${event.id}:`,
            error,
          );
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }
}
