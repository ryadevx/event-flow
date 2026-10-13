import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { db } from '../database/database';
import { events } from '../database/schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

jest.mock('../database/database', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
  },
}));

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsService],
    }).compile();
    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an event successfully', async () => {
      const dto: CreateEventDto = {
        name: 'Concert',
        location: 'NYC',
        startsAt: '2026-12-01T00:00:00Z',
        capacity: 100,
      };
      const userId = 'user-123';

      const mockEvent = {
        id: 'event-123',
        name: 'Concert',
        location: 'NYC',
        startsAt: new Date('2026-12-01'),
        capacity: 100,
        createdBy: userId,
        createdAt: new Date(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([mockEvent]),
            }),
          }),
        });
      });

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockEvent);
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event successfully', async () => {
      const eventId = 'event-123';
      const dto: UpdateEventDto = { name: 'Updated Concert' };
      const userId = 'user-123';

      const mockEvent = {
        id: 'event-123',
        name: 'Concert',
        location: 'NYC',
        startsAt: new Date('2026-12-01'),
        capacity: 100,
        createdBy: userId,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                for: jest.fn().mockResolvedValue([mockEvent]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ ...mockEvent, name: 'Updated Concert' }]),
              }),
            }),
          }),
        });
      });

      const result = await service.update(eventId, dto, userId);

      expect(result.name).toBe('Updated Concert');
    });

    it('should reject update from non-owner', async () => {
      const eventId = 'event-123';
      const dto: UpdateEventDto = { name: 'Updated Concert' };
      const userId = 'user-456';

      const mockEvent = {
        id: 'event-123',
        name: 'Concert',
        location: 'NYC',
        startsAt: new Date('2026-12-01'),
        capacity: 100,
        createdBy: 'user-123',
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                for: jest.fn().mockResolvedValue([mockEvent]),
              }),
            }),
          }),
        });
      });

      await expect(service.update(eventId, dto, userId)).rejects.toThrow('You can only modify your own events');
    });
  });

  describe('remove', () => {
    it('should delete an event successfully', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';

      const mockEvent = {
        id: 'event-123',
        name: 'Concert',
        location: 'NYC',
        startsAt: new Date('2026-12-01'),
        capacity: 100,
        createdBy: userId,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                for: jest.fn().mockResolvedValue([mockEvent]),
              }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      const result = await service.remove(eventId, userId);

      expect(result.message).toBe('Event deleted successfully');
    });

    it('should reject delete from non-owner', async () => {
      const eventId = 'event-123';
      const userId = 'user-456';

      const mockEvent = {
        id: 'event-123',
        name: 'Concert',
        location: 'NYC',
        startsAt: new Date('2026-12-01'),
        capacity: 100,
        createdBy: 'user-123',
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                for: jest.fn().mockResolvedValue([mockEvent]),
              }),
            }),
          }),
        });
      });

      await expect(service.remove(eventId, userId)).rejects.toThrow('You can only modify your own events');
    });
  });
});
