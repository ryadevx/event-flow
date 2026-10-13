import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppService } from './app.service';
import { JwtAuthGuard } from '@event-ticketing/shared';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  private forwardHeaders(request: Request, headers: Record<string, string>) {
    const allowed = [
      'authorization',
      'content-type',
      'idempotency-key',
      'x-forwarded-for',
      'x-real-ip',
    ];
    const filtered: Record<string, string> = {};
    for (const key of allowed) {
      if (headers[key]) {
        filtered[key] = headers[key];
      }
    }
    const clientIp = request.ip || request.socket?.remoteAddress;
    if (clientIp) {
      filtered['x-forwarded-for'] = headers['x-forwarded-for']
        ? `${headers['x-forwarded-for']}, ${clientIp}`
        : clientIp;
      filtered['x-real-ip'] = clientIp;
    }
    return filtered;
  }

  // -------------------------
  // AUTH - PUBLIC
  // -------------------------

  @All('auth')
  authRoot(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      request.method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      `${process.env.AUTH_SERVICE_URL}/auth`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @All('auth/:path')
  auth(
    @Param('path') path: string,
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      request.method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      `${process.env.AUTH_SERVICE_URL}/auth/${path}`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  // -------------------------
  // EVENTS
  // -------------------------

  @Get('events')
  eventsRoot(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'GET',
      `${process.env.EVENTS_SERVICE_URL}/events`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @Get('events/:path')
  event(
    @Param('path') path: string,
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'GET',
      `${process.env.EVENTS_SERVICE_URL}/events/${path}`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  createEvent(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'POST',
      `${process.env.EVENTS_SERVICE_URL}/events`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @Patch('events/:path')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  updateEvent(
    @Param('path') path: string,
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'PATCH',
      `${process.env.EVENTS_SERVICE_URL}/events/${path}`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @Delete('events/:path')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  deleteEvent(
    @Param('path') path: string,
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'DELETE',
      `${process.env.EVENTS_SERVICE_URL}/events/${path}`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  // -------------------------
  // TICKETS
  // -------------------------

  @Get('tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  ticketsRoot(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'GET',
      `${process.env.TICKETS_SERVICE_URL}/tickets`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }

  @Post('tickets/purchase')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  purchaseTicket(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.appService.forward(
      'POST',
      `${process.env.TICKETS_SERVICE_URL}/tickets/purchase`,
      body,
      this.forwardHeaders(request, headers),
      request.query,
    );
  }
}
