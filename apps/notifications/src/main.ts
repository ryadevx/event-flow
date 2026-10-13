import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NotificationsModule } from './notifications.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);

  app.connectMicroservice({
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
        groupId: 'notifications-service',
      },
      subscribe: {
        fromBeginning: process.env.NODE_ENV === 'development',
      },
    },
  });

  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3004);
}

bootstrap();
