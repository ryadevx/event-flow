import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { db } from '../database/database';
import { events, tickets, idempotencyKeys } from '../database/schema';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';

jest.mock('../database/database', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService],
    }).compile();
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('purchase', () => {
    const mockEvent = {
      id: 'event-123',
      name: 'Concert',
      capacity: 100,
      availableTickets: 100,
      soldTickets: 0,
      startsAt: new Date('2026-12-01'),
      deletedAt: null,
    };

    it('should purchase tickets successfully', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 2 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      const mockTicket = {
        id: 'ticket-123',
        eventId: 'event-123',
        userId: 'user-123',
        quantity: 2,
        createdAt: new Date(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId }]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ ...mockEvent, availableTickets: 98, soldTickets: 2 }]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockEvent]),
              }),
            }),
          }),
        });
      });

      const result = await service.purchase(dto, userId, idempotencyKey);

      expect(result).toBeDefined();
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should return same ticket for duplicate idempotency key', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 2 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      const mockTicket = {
        id: 'ticket-123',
        eventId: 'event-123',
        userId: 'user-123',
        quantity: 2,
        createdAt: new Date(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId, ticketId: 'ticket-123' }]),
              }),
            }),
          }),
        });
      });

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTicket]),
          }),
        }),
      });

      const result = await service.purchase(dto, userId, idempotencyKey);

      expect(result).toEqual(mockTicket);
    });

    it('should reject purchase when not enough tickets', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 10 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId }]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ ...mockEvent, availableTickets: 5 }]),
              }),
            }),
          }),
        });
      });

      await expect(service.purchase(dto, userId, idempotencyKey)).rejects.toThrow('Not enough tickets available');
    });

    it('should reject purchase for deleted event', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 2 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId }]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ ...mockEvent, deletedAt: new Date() }]),
              }),
            }),
          }),
        });
      });

      await expect(service.purchase(dto, userId, idempotencyKey)).rejects.toThrow('Not enough tickets available');
    });

    it('should reject purchase for expired event', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 2 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId }]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ ...mockEvent, startsAt: new Date('2020-01-01') }]),
              }),
            }),
          }),
        });
      });

      await expect(service.purchase(dto, userId, idempotencyKey)).rejects.toThrow('Event has already started');
    });

    it('should reject purchase for non-existent event', async () => {
      const dto: PurchaseTicketDto = { eventId: 'event-123', quantity: 2 };
      const userId = 'user-123';
      const idempotencyKey = 'key-123';

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ key: idempotencyKey, userId }]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });
      });

      await expect(service.purchase(dto, userId, idempotencyKey)).rejects.toThrow('Event not found');
    });
  });
});
