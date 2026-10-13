import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async sendTicketPurchasedNotification(data: {
    ticketId: string;
    eventId: string;
    userId: string;
    quantity: number;
  }) {
    const message = `Ticket purchased successfully. Ticket ID: ${data.ticketId}, Event ID: ${data.eventId}, Quantity: ${data.quantity}`;

    console.log('NOTIFICATION:', message);

    return {
      success: true,
      message,
    };
  }
}
