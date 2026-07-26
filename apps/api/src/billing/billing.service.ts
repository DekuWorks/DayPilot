import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SubscriptionTier, SubscriptionStatus } from '../generated/prisma';

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  canceled: 'canceled',
  past_due: 'past_due',
  trialing: 'trialing',
  unpaid: 'past_due',
  incomplete: 'past_due',
  incomplete_expired: 'canceled',
};

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' });
    }
    this.webhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? null;
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Billing is not configured');
    }
    return this.stripe;
  }

  async getSubscription(userId: string) {
    let sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: { userId },
      });
    }
    return {
      tier: sub.tier,
      status: sub.status ?? 'active',
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      stripeCustomerId: sub.stripeCustomerId ?? null,
      configured: Boolean(this.stripe),
    };
  }

  /** Public catalog of Stripe prices that are configured in env. */
  listPlans() {
    const plans: Array<{
      tier: SubscriptionTier;
      priceId: string;
      label: string;
      interval: 'month';
    }> = [];
    const personal = this.config.get<string>('STRIPE_PRICE_PERSONAL');
    const business = this.config.get<string>('STRIPE_PRICE_BUSINESS');
    const enterprise = this.config.get<string>('STRIPE_PRICE_ENTERPRISE');
    if (personal) {
      plans.push({
        tier: 'Personal',
        priceId: personal,
        label: 'Personal',
        interval: 'month',
      });
    }
    if (business) {
      plans.push({
        tier: 'Business',
        priceId: business,
        label: 'Business',
        interval: 'month',
      });
    }
    if (enterprise) {
      plans.push({
        tier: 'Enterprise',
        priceId: enterprise,
        label: 'Enterprise',
        interval: 'month',
      });
    }
    return {
      configured: Boolean(this.stripe),
      plans,
    };
  }

  /**
   * Confirm an App Store / Play Store purchase and map product → tier.
   * Full App Store Server API verification can be enabled later via
   * APPLE_IAP_ISSUER_ID / APPLE_IAP_KEY_ID / APPLE_IAP_PRIVATE_KEY.
   * When APPLE_IAP_SKIP_VERIFY=1 (local/StoreKit testing), we trust the client.
   */
  async confirmApplePurchase(
    userId: string,
    input: { productId: string; transactionId: string },
  ) {
    const tier = this.appleProductIdToTier(input.productId);
    if (!tier) {
      throw new BadRequestException(
        `Unknown App Store product: ${input.productId}`,
      );
    }
    const skip =
      this.config.get<string>('APPLE_IAP_SKIP_VERIFY') === '1' ||
      this.config.get<string>('NODE_ENV') !== 'production';
    if (!skip) {
      // Production path: require a verified transaction id at minimum.
      // Hook App Store Server API here when keys are configured.
      if (!input.transactionId?.trim()) {
        throw new BadRequestException('Missing transactionId');
      }
      const hasAppleKeys =
        Boolean(this.config.get<string>('APPLE_IAP_ISSUER_ID')) &&
        Boolean(this.config.get<string>('APPLE_IAP_KEY_ID'));
      if (!hasAppleKeys) {
        throw new BadRequestException(
          'Apple IAP verification is not configured. Set APPLE_IAP_* or APPLE_IAP_SKIP_VERIFY=1 for StoreKit testing.',
        );
      }
    }

    const existing = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const data = {
      tier,
      status: 'active' as SubscriptionStatus,
      // Store Apple transaction id in stripeSubscriptionId slot until a dedicated column exists
      stripeSubscriptionId: `apple:${input.transactionId}`,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.subscription.create({
        data: { userId, ...data },
      });
    }
    await this.audit.log({
      action: 'billing.apple_purchase_confirmed',
      entityType: 'subscription',
      userId,
      metadata: {
        productId: input.productId,
        transactionId: input.transactionId,
        tier,
      },
    });
    return this.getSubscription(userId);
  }

  private appleProductIdToTier(productId: string): SubscriptionTier | null {
    const personal =
      this.config.get<string>('APPLE_PRODUCT_PERSONAL') ??
      'co.daypilot.personal.monthly';
    const business =
      this.config.get<string>('APPLE_PRODUCT_BUSINESS') ??
      'co.daypilot.business.monthly';
    const enterprise =
      this.config.get<string>('APPLE_PRODUCT_ENTERPRISE') ??
      'co.daypilot.enterprise.monthly';
    if (productId === personal) return 'Personal';
    if (productId === business) return 'Business';
    if (productId === enterprise) return 'Enterprise';
    return null;
  }

  private async getOrCreateStripeCustomerInternal(
    userId: string,
    email: string,
  ): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const stripe = this.ensureStripe();
    if (sub?.stripeCustomerId) return sub.stripeCustomerId;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      if (sub) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        await this.prisma.subscription.create({
          data: { userId, stripeCustomerId: customerId },
        });
      }
      return customerId;
    }
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });
    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { stripeCustomerId: customer.id },
      });
    } else {
      await this.prisma.subscription.create({
        data: { userId, stripeCustomerId: customer.id },
      });
    }
    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    userEmail: string,
    priceId: string,
  ) {
    const stripe = this.ensureStripe();
    const customerId = await this.getOrCreateStripeCustomerInternal(
      userId,
      userEmail,
    );
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId },
      success_url: `${frontendUrl}/billing?success=true`,
      cancel_url: `${frontendUrl}/billing?canceled=true`,
    });
    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const stripe = this.ensureStripe();
    const sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException(
        'No billing customer found. Subscribe to a plan first.',
      );
    }
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });
    await this.audit.log({
      action: 'billing.portal_visited',
      entityType: 'subscription',
      userId,
    });
    return { url: session.url };
  }

  private priceIdToTier(priceId: string): SubscriptionTier {
    const personal = this.config.get<string>('STRIPE_PRICE_PERSONAL');
    const business = this.config.get<string>('STRIPE_PRICE_BUSINESS');
    const enterprise = this.config.get<string>('STRIPE_PRICE_ENTERPRISE');
    if (priceId === enterprise) return 'Enterprise';
    if (priceId === business) return 'Business';
    if (priceId === personal) return 'Personal';
    return 'Personal';
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.webhookSecret || !this.stripe) {
      throw new BadRequestException('Webhook not configured');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature');
    }
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const subscription = await this.stripe.subscriptions.retrieve(subId);
        const userId =
          session.metadata?.user_id ??
          (await this.userIdFromStripeCustomer(session.customer as string));
        if (userId) {
          await this.upsertSubscriptionFromStripe(subscription, userId);
          await this.audit.log({
            action: 'billing.subscription_updated',
            entityType: 'subscription',
            userId,
            metadata: {
              stripeSubscriptionId: subscription.id,
              source: 'checkout.session.completed',
            },
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = await this.userIdFromStripeCustomer(
          subscription.customer as string,
        );
        if (userId) {
          await this.upsertSubscriptionFromStripe(subscription, userId);
          await this.audit.log({
            action: 'billing.subscription_updated',
            entityType: 'subscription',
            userId,
            metadata: { stripeSubscriptionId: subscription.id },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const existing = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          select: { userId: true },
        });
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            tier: 'Free',
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        if (existing?.userId) {
          await this.audit.log({
            action: 'billing.subscription_canceled',
            entityType: 'subscription',
            userId: existing.userId,
            metadata: { stripeSubscriptionId: subscription.id },
          });
        }
        break;
      }
      default:
        break;
    }
    return { received: true };
  }

  private async userIdFromStripeCustomer(
    customerId: string,
  ): Promise<string | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    return sub?.userId ?? null;
  }

  private async upsertSubscriptionFromStripe(
    stripeSub: Stripe.Subscription,
    userId: string,
  ) {
    const priceId = stripeSub.items.data[0]?.price.id;
    const tier = priceId ? this.priceIdToTier(priceId) : 'Personal';
    const status = STRIPE_STATUS_MAP[stripeSub.status] ?? 'active';
    const periodEnd =
      (stripeSub as { current_period_end?: number }).current_period_end ?? 0;
    const currentPeriodEnd = new Date(periodEnd * 1000);
    const stripeCustomerId =
      typeof stripeSub.customer === 'string'
        ? stripeSub.customer
        : stripeSub.customer.id;
    const sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          stripeCustomerId,
          stripeSubscriptionId: stripeSub.id,
          tier,
          status,
          currentPeriodEnd,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId,
          stripeSubscriptionId: stripeSub.id,
          tier,
          status,
          currentPeriodEnd,
        },
      });
    }
  }
}
