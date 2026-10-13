import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { KafkaTopics } from '@event-ticketing/shared';
import { db } from '../database/database';
import { events, outboxEvents } from '../database/schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  async findAll() {
    return db.select().from(events);
  }

  async findOne(eventId: string) {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async create(dto: CreateEventDto, userId: string) {
    return db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          name: dto.name,
          description: dto.description,
          location: dto.location,
          startsAt: new Date(dto.startsAt),
          capacity: dto.capacity,
          createdBy: userId,
        })
        .returning();

      await tx.insert(outboxEvents).values({
        type: KafkaTopics.EVENT_CREATED,
        aggregateId: event.id,
        payload: JSON.stringify({
          eventId: event.id,
          name: event.name,
          location: event.location,
          startsAt: event.startsAt,
          capacity: event.capacity,
          createdBy: event.createdBy,
        }),
      });

      return event;
    });
  }

  async update(
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
    isAdmin = false,
  ) {
    return db.transaction(async (tx) => {
      const [existingEvent] = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .for('update');

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      if (!isAdmin && existingEvent.createdBy !== userId) {
        throw new ForbiddenException('You can only modify your own events');
      }

      const [updatedEvent] = await tx
        .update(events)
        .set({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.startsAt !== undefined && {
            startsAt: new Date(dto.startsAt),
          }),
          ...(dto.capacity !== undefined && { capacity: dto.capacity }),
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning();

      await tx.insert(outboxEvents).values({
        type: KafkaTopics.EVENT_UPDATED,
        aggregateId: updatedEvent.id,
        payload: JSON.stringify({
          eventId: updatedEvent.id,
          name: updatedEvent.name,
          description: updatedEvent.description,
          location: updatedEvent.location,
          startsAt: updatedEvent.startsAt,
          capacity: updatedEvent.capacity,
          createdBy: updatedEvent.createdBy,
        }),
      });

      return updatedEvent;
    });
  }

  async remove(eventId: string, userId: string, isAdmin = false) {
    return db.transaction(async (tx) => {
      const [existingEvent] = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .for('update');

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      if (!isAdmin && existingEvent.createdBy !== userId) {
        throw new ForbiddenException('You can only modify your own events');
      }

      await tx.delete(events).where(eq(events.id, eventId));

      await tx.insert(outboxEvents).values({
        type: KafkaTopics.EVENT_DELETED,
        aggregateId: eventId,
        payload: JSON.stringify({
          eventId,
        }),
      });

      return { message: 'Event deleted successfully', eventId };
    });
  }
}
