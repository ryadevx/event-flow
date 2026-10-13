import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';
import { OutboxPublisher } from './outbox.publisher';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID,
            brokers: [process.env.KAFKA_BROKER!],
          },
          consumer: {
            groupId: 'tickets-service-client',
          },
        },
      },
    ]),
  ],
  providers: [KafkaService, OutboxPublisher],
  exports: [KafkaService],
})
export class KafkaModule {}
