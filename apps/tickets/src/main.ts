import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { CompressionCodecs, CompressionTypes } from 'kafkajs';
import SnappyCodec from 'kafkajs-snappy';
import { AppModule } from './app.module';

CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: [process.env.KAFKA_BROKER!],
      },
      consumer: {
        groupId: 'tickets-service-consumer',
      },
      subscribe: {
        fromBeginning: process.env.NODE_ENV === 'development',
      },
    },
  });

  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3003);
}

bootstrap();
