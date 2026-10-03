import { IsEmail, IsISO8601, IsUUID } from 'class-validator';

export class SendBookingConfirmationDto {
  @IsUUID()
  bookingLinkId!: string;

  @IsISO8601()
  start!: string;

  @IsEmail()
  bookerEmail!: string;
}
