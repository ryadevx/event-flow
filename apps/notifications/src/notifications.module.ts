import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { KafkaConsumerController } from './messaging/kafka.consumer';
import { KafkaModule } from './messaging/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [
    NotificationsController,
    KafkaConsumerController,
  ],
  providers: [NotificationsService],
})
export class NotificationsModule {}
