import { z } from 'zod';

export const TicketPurchasedSchema = z.object({
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const EventCreatedSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  startsAt: z.string().datetime(),
  capacity: z.number().int().positive(),
  createdBy: z.string().uuid(),
});

export const EventUpdatedSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  startsAt: z.string().datetime(),
  capacity: z.number().int().positive(),
});

export const EventDeletedSchema = z.object({
  eventId: z.string().uuid(),
});

export const UserRegisteredSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
});
