import 'dotenv/config';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@event-ticketing/shared';

import { KafkaConsumerController } from './messaging/kafka.consumer';
import { KafkaModule } from './messaging/kafka.module';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    KafkaModule,
  ],
  controllers: [
    KafkaConsumerController,
    TicketsController,
  ],
  providers: [
    TicketsService,
    JwtAuthGuard,
  ],
})
export class AppModule {}
