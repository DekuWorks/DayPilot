import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingConfirmationService } from './booking-confirmation.service';
import { SendBookingConfirmationDto } from './dto/send-booking-confirmation.dto';

@Controller('bookings')
export class BookingConfirmationController {
  constructor(private readonly confirmation: BookingConfirmationService) {}

  /** Public. Emails only the address stored on a confirmed booking. */
  @Post('confirmation')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  send(@Body() body: SendBookingConfirmationDto) {
    return this.confirmation.send(body);
  }
}
