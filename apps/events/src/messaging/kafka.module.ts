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
            sasl: process.env.KAFKA_SASL_USERNAME ? {
              mechanism: (process.env.KAFKA_SASL_MECHANISM as any) || 'scram-sha-256',
              username: process.env.KAFKA_SASL_USERNAME,
              password: process.env.KAFKA_SASL_PASSWORD!,
            } : undefined,
          },
          consumer: {
            groupId: 'events-service',
          },
        },
      },
    ]),
  ],
  providers: [KafkaService, OutboxPublisher],
  exports: [KafkaService],
})
export class KafkaModule {}
