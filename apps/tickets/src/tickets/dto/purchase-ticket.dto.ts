import { IsInt, IsNotEmpty, IsUUID, Min, Max } from 'class-validator';

export class PurchaseTicketDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}
