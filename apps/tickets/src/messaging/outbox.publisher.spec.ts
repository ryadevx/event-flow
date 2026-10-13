import { Test, TestingModule } from '@nestjs/testing';
import { OutboxPublisher } from './outbox.publisher';
import { KafkaService } from './kafka.service';
import { db } from '../database/database';

jest.mock('../database/database', () => ({
  db: {
    transaction: jest.fn(),
    update: jest.fn(),
  },
}));

describe('OutboxPublisher', () => {
  let publisher: OutboxPublisher;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisher,
        {
          provide: KafkaService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    publisher = module.get<OutboxPublisher>(OutboxPublisher);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishPendingEvents', () => {
    it('should publish pending events to Kafka', async () => {
      const mockEvent = {
        id: 'event-123',
        type: 'ticket.purchased',
        aggregateId: 'ticket-123',
        payload: JSON.stringify({ ticketId: 'ticket-123', quantity: 2 }),
        createdAt: new Date(),
        publishedAt: null,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          execute: jest.fn().mockResolvedValue({
            rows: [mockEvent],
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        });
      });

      await (publisher as any).publishPendingEvents();

      expect(kafkaService.publish).toHaveBeenCalledWith(
        'ticket.purchased',
        expect.objectContaining({
          id: 'event-123',
          aggregateId: 'ticket-123',
        }),
        'ticket-123',
      );
    });

    it('should skip execution when already publishing', async () => {
      (publisher as any).isPublishing = true;

      await (publisher as any).publishPendingEvents();

      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('should reset published_at on Kafka failure', async () => {
      const mockEvent = {
        id: 'event-123',
        type: 'ticket.purchased',
        aggregateId: 'ticket-123',
        payload: JSON.stringify({ ticketId: 'ticket-123', quantity: 2 }),
        createdAt: new Date(),
        publishedAt: null,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          execute: jest.fn().mockResolvedValue({
            rows: [mockEvent],
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        });
      });

      (kafkaService.publish as jest.Mock).mockRejectedValue(new Error('Kafka unavailable'));

      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await (publisher as any).publishPendingEvents();

      expect(db.update).toHaveBeenCalled();
    });
  });
});
