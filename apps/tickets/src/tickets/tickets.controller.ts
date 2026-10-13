import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@event-ticketing/shared';
import type { AuthenticatedRequest } from '@event-ticketing/shared';

import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findMyTickets(@Req() request: AuthenticatedRequest) {
    const user = request.user;

    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only customers or admins can view tickets',
      );
    }

    return this.ticketsService.findMyTickets(user.sub);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(
    @Body() dto: PurchaseTicketDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency-Key header is required',
      );
    }

    const user = request.user;

    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only customers or admins can purchase tickets',
      );
    }

    return this.ticketsService.purchase(
      dto,
      user.sub,
      idempotencyKey,
    );
  }
}
