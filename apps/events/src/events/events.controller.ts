import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '@event-ticketing/shared';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') eventId: string) {
    return this.eventsService.findOne(eventId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(
    @Body() dto: CreateEventDto,
    @Req() request: Request,
  ) {
    const user = request.user as {
      sub: string;
      email: string;
      role: string;
    };

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only organizers or admins can create events',
      );
    }

    return this.eventsService.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
    @Req() request: Request,
  ) {
    const user = request.user as {
      sub: string;
      email: string;
      role: string;
    };

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only organizers or admins can update events',
      );
    }

    return this.eventsService.update(
      eventId,
      dto,
      user.sub,
      user.role === 'ADMIN',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') eventId: string,
    @Req() request: Request,
  ) {
    const user = request.user as {
      sub: string;
      email: string;
      role: string;
    };

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only organizers or admins can delete events',
      );
    }

    return this.eventsService.remove(
      eventId,
      user.sub,
      user.role === 'ADMIN',
    );
  }
}
