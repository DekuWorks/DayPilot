import { Module } from '@nestjs/common';
import { BookingConfirmationController } from './booking-confirmation.controller';
import { BookingConfirmationService } from './booking-confirmation.service';

@Module({
  controllers: [BookingConfirmationController],
  providers: [BookingConfirmationService],
})
export class BookingConfirmationModule {}
