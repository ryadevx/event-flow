import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { db } from '../database/database';
import { users } from '../database/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

jest.mock('../database/database', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto: RegisterDto = { email: 'test@example.com', password: 'password123' };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
        createdAt: new Date(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([mockUser]),
              }),
            }),
          }),
        });
      });

      const result = await service.register(dto);

      expect(result).toEqual(mockUser);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should return ConflictException for duplicate email', async () => {
      const dto: RegisterDto = { email: 'test@example.com', password: 'password123' };

      (db.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });
      });

      await expect(service.register(dto)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
        passwordHash: 'hashed-password',
      };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const result = await service.login(dto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const dto: LoginDto = { email: 'nonexistent@example.com', password: 'password123' };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'wrong-password' };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
        passwordHash: 'hashed-password',
      };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });
});
