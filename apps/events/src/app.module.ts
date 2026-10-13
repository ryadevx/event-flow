import 'dotenv/config';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { JwtAuthGuard } from '@event-ticketing/shared';
import { KafkaModule } from './messaging/kafka.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),

    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),

    KafkaModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
