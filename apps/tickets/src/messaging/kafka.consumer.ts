import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../database/database';
import { events, inboxEvents, tickets } from '../database/schema';
import {
  KafkaTopics,
  EventCreatedSchema,
  EventUpdatedSchema,
  EventDeletedSchema,
} from '@event-ticketing/shared';

@Controller()
export class KafkaConsumerController {
  @MessagePattern(KafkaTopics.EVENT_CREATED)
  async handleEventCreated(@Payload() message: any) {
    const parsed = EventCreatedSchema.safeParse(message?.payload ?? message);

    if (!parsed.success) {
      console.error('Invalid event.created payload:', parsed.error);
      return;
    }

    const event = parsed.data;
    const messageId = message.id;

    await db.transaction(async (tx) => {
      const [claimedEvent] = await tx
        .insert(inboxEvents)
        .values({
          id: messageId,
          type: KafkaTopics.EVENT_CREATED,
        })
        .onConflictDoNothing({
          target: inboxEvents.id,
        })
        .returning();

      if (!claimedEvent) {
        console.log(`Duplicate event ignored: ${messageId}`);
        return;
      }

      await tx
        .insert(events)
        .values({
          id: event.eventId,
          name: event.name,
          capacity: Number(event.capacity),
          availableTickets: Number(event.capacity),
          startsAt: new Date(event.startsAt),
        })
        .onConflictDoNothing({
          target: events.id,
        });

      console.log(`Event synchronized: ${event.eventId}`);
    });
  }

  @MessagePattern(KafkaTopics.EVENT_UPDATED)
  async handleEventUpdated(@Payload() message: any) {
    const parsed = EventUpdatedSchema.safeParse(message?.payload ?? message);

    if (!parsed.success) {
      console.error('Invalid event.updated payload:', parsed.error);
      return;
    }

    const event = parsed.data;
    const messageId = message.id;

    await db.transaction(async (tx) => {
      const [claimedEvent] = await tx
        .insert(inboxEvents)
        .values({
          id: messageId,
          type: KafkaTopics.EVENT_UPDATED,
        })
        .onConflictDoNothing({
          target: inboxEvents.id,
        })
        .returning();

      if (!claimedEvent) {
        console.log(`Duplicate event.updated ignored: ${messageId}`);
        return;
      }

      const [existingEvent] = await tx
        .select()
        .from(events)
        .where(
          and(
            eq(events.id, event.eventId),
            isNull(events.deletedAt),
          ),
        )
        .for('update');

      if (!existingEvent) {
        return;
      }

      const newCapacity = Number(event.capacity);
      const soldTickets = Number(existingEvent.soldTickets);
      const newAvailableTickets = Math.max(
        0,
        newCapacity - soldTickets,
      );

      await tx
        .update(events)
        .set({
          name: event.name,
          capacity: newCapacity,
          availableTickets: newAvailableTickets,
          startsAt: new Date(event.startsAt),
        })
        .where(eq(events.id, event.eventId));
    });

    console.log(`Event updated locally: ${event.eventId}`);
  }

  @MessagePattern(KafkaTopics.EVENT_DELETED)
  async handleEventDeleted(@Payload() message: any) {
    const parsed = EventDeletedSchema.safeParse(message?.payload ?? message);

    if (!parsed.success) {
      console.error('Invalid event.deleted payload:', parsed.error);
      return;
    }

    const event = parsed.data;
    const messageId = message.id;

    await db.transaction(async (tx) => {
      const [claimedEvent] = await tx
        .insert(inboxEvents)
        .values({
          id: messageId,
          type: KafkaTopics.EVENT_DELETED,
        })
        .onConflictDoNothing({
          target: inboxEvents.id,
        })
        .returning();

      if (!claimedEvent) {
        console.log(`Duplicate event.deleted ignored: ${messageId}`);
        return;
      }

      const [ticketCount] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(eq(tickets.eventId, event.eventId));

      if (Number(ticketCount.count) > 0) {
        await tx
          .update(events)
          .set({ deletedAt: new Date() })
          .where(eq(events.id, event.eventId));
      } else {
        await tx
          .delete(events)
          .where(eq(events.id, event.eventId));
      }
    });

    console.log(`Event deleted locally: ${event.eventId}`);
  }
}
