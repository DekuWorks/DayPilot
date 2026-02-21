import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  async getSubscription(@Req() req: { user: { id: string } }) {
    return this.billingService.getSubscription(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: { user: { id: string; email?: string } },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const email = req.user.email ?? '';
    return this.billingService.createCheckoutSession(req.user.id, email, dto.priceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal-session')
  async createPortalSession(@Req() req: { user: { id: string } }) {
    return this.billingService.createPortalSession(req.user.id);
  }

  @SkipThrottle()
  @Post('webhook')
  async webhook(
    @Req() req: RequestWithRawBody & { headers: { [key: string]: string } },
  ) {
    const rawBody = req.rawBody;
    const signature = req.headers['stripe-signature'];
    if (!rawBody) {
      throw new BadRequestException('Raw body required for webhook. Configure server to preserve raw body for POST /billing/webhook.');
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
