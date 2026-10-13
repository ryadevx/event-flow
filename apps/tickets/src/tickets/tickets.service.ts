import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, gt, isNull, sql } from 'drizzle-orm';
import { KafkaTopics } from '@event-ticketing/shared';
import { createHash } from 'crypto';
import { db } from '../database/database';
import {
  events,
  outboxEvents,
  tickets,
  idempotencyKeys,
} from '../database/schema';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';

@Injectable()
export class TicketsService {
  async findMyTickets(userId: string) {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId));
  }

  async purchase(
    dto: PurchaseTicketDto,
    userId: string,
    idempotencyKey: string,
  ) {
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ eventId: dto.eventId, quantity: dto.quantity }))
      .digest('hex');

    return db.transaction(async (tx) => {
      // 1. Atomically claim the idempotency key.
      //
      // Only ONE concurrent request can successfully insert
      // this (userId, idempotencyKey) pair.
      const [claimedKey] = await tx
        .insert(idempotencyKeys)
        .values({
          key: idempotencyKey,
          userId,
          payloadHash,
        })
        .onConflictDoNothing({
          target: [
            idempotencyKeys.key,
            idempotencyKeys.userId,
          ],
        })
        .returning();

      // 2. Another request already owns this idempotency key.
      if (!claimedKey) {
        const [existingRequest] = await tx
          .select()
          .from(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.key, idempotencyKey),
              eq(idempotencyKeys.userId, userId),
            ),
          )
          .limit(1);

        if (existingRequest?.ticketId) {
          if (existingRequest.payloadHash === payloadHash) {
            const [existingTicket] = await tx
              .select()
              .from(tickets)
              .where(eq(tickets.id, existingRequest.ticketId))
              .limit(1);

            if (existingTicket) {
              return existingTicket;
            }
          }

          throw new ConflictException(
            'Idempotency key already used with different payload',
          );
        }

        throw new ConflictException(
          'A request with this idempotency key is already being processed. Please retry.',
        );
      }

      // 3. Atomically decrease available tickets.
      //
      // PostgreSQL checks the condition and performs the
      // subtraction as one atomic operation.
      const [updatedEvent] = await tx
        .update(events)
        .set({
          availableTickets:
            sql`${events.availableTickets} - ${dto.quantity}`,
          soldTickets: sql`${events.soldTickets} + ${dto.quantity}`,
        })
        .where(
          and(
            eq(events.id, dto.eventId),
            gte(events.availableTickets, dto.quantity),
            gt(events.startsAt, new Date()),
            isNull(events.deletedAt),
          ),
        )
        .returning();

      if (!updatedEvent) {
        const [event] = await tx
          .select()
          .from(events)
          .where(eq(events.id, dto.eventId))
          .limit(1);

        if (!event) {
          throw new NotFoundException('Event not found');
        }

        if (event.startsAt <= new Date()) {
          throw new BadRequestException(
            'Event has already started',
          );
        }

        throw new BadRequestException(
          'Not enough tickets available',
        );
      }

      // 4. Create the ticket.
      const [ticket] = await tx
        .insert(tickets)
        .values({
          eventId: dto.eventId,
          userId,
          quantity: dto.quantity,
        })
        .returning();

      // 5. Create the Kafka outbox event.
      await tx.insert(outboxEvents).values({
        type: KafkaTopics.TICKET_PURCHASED,
        aggregateId: ticket.id,
        payload: JSON.stringify({
          ticketId: ticket.id,
          eventId: ticket.eventId,
          userId: ticket.userId,
          quantity: ticket.quantity,
        }),
      });

      // 6. Connect the idempotency key to the created ticket.
      await tx
        .update(idempotencyKeys)
        .set({
          ticketId: ticket.id,
        })
        .where(
          and(
            eq(idempotencyKeys.key, idempotencyKey),
            eq(idempotencyKeys.userId, userId),
          ),
        );

      return ticket;
    });
  }
}
