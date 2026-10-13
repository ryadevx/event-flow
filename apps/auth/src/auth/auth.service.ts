import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { KafkaTopics } from '@event-ticketing/shared';
import { db } from '../database/database';
import { outboxEvents, users } from '../database/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: dto.email,
          passwordHash,
          role: 'CUSTOMER',
        })
        .onConflictDoNothing({
          target: users.email,
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        });

      if (!user) {
        throw new ConflictException('Email already registered');
      }

      await tx.insert(outboxEvents).values({
        type: KafkaTopics.USER_REGISTERED,
        aggregateId: user.id,
        payload: JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
      });

      return user;
    });
  }

  async validateUser(dto: LoginDto) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    const user = result[0];

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user,
    };
  }
}
