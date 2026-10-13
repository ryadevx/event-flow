import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { eq, sql } from 'drizzle-orm';
import { KafkaTopics, TicketPurchasedSchema } from '@event-ticketing/shared';
import { db } from '../database/database';
import { inboxEvents } from '../database/schema';
import { NotificationsService } from '../notifications.service';
import { KafkaService } from './kafka.service';

@Controller()
export class KafkaConsumerController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly kafkaService: KafkaService,
  ) {}

  @MessagePattern(KafkaTopics.TICKET_PURCHASED)
  async handleTicketPurchased(@Payload() message: any) {
    const parsed = TicketPurchasedSchema.safeParse(message?.payload ?? message);

    if (!parsed.success) {
      console.error('Invalid ticket.purchased payload:', parsed.error);
      return;
    }

    const ticket = parsed.data;
    const eventId = message?.id;

    // Step 1: Check if this message was already successfully processed or sent to DLQ
    const [existingRecord] = await db
      .select()
      .from(inboxEvents)
      .where(eq(inboxEvents.id, eventId))
      .limit(1);

    if (existingRecord && (!existingRecord.lastError || existingRecord.retryCount >= 3)) {
      console.log(`Duplicate event ignored: ${eventId}`);
      return;
    }

    // Step 2: Dispatch notification OUTSIDE the database transaction
    try {
      await this.notificationsService.sendTicketPurchasedNotification(
        ticket,
      );

      // On success, mark as processed with no error
      if (existingRecord) {
        await db
          .update(inboxEvents)
          .set({
            lastError: null,
            processedAt: new Date(),
          })
          .where(eq(inboxEvents.id, eventId));
      } else {
        await db
          .insert(inboxEvents)
          .values({
            id: eventId,
            type: KafkaTopics.TICKET_PURCHASED,
            retryCount: 0,
            lastError: null,
          })
          .onConflictDoNothing();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Step 3: Track failure count and error in database
      if (existingRecord) {
        await db
          .update(inboxEvents)
          .set({
            retryCount: sql`${inboxEvents.retryCount} + 1`,
            lastError: errorMessage,
          })
          .where(eq(inboxEvents.id, eventId));
      } else {
        await db
          .insert(inboxEvents)
          .values({
            id: eventId,
            type: KafkaTopics.TICKET_PURCHASED,
            retryCount: 1,
            lastError: errorMessage,
          })
          .onConflictDoNothing();
      }

      // Step 4: Check retry count and send to DLQ if exceeded
      const [record] = await db
        .select()
        .from(inboxEvents)
        .where(eq(inboxEvents.id, eventId))
        .limit(1);

      if (record && record.retryCount >= 3) {
        await this.kafkaService.publish(
          `${KafkaTopics.TICKET_PURCHASED}.dlq`,
          message,
          eventId,
        );
        console.error(
          `Message ${eventId} sent to DLQ after 3 retries`,
        );
      } else {
        throw error;
      }
    }
  }
}
