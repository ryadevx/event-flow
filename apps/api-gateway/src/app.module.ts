import 'dotenv/config';

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from '@event-ticketing/shared';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    HttpModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AppModule {}
