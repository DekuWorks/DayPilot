import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import {
  APPLE_CONFIRM_PERIOD_DAYS,
  FREE_CALENDAR_CONNECTION_LIMIT,
  decideFoundingClaim,
  entitlementsForSubscription,
  formatSubscriptionDisplayName,
  foundingOfferEnabled,
  foundingOfferSnapshot,
  appleProductMapping as mapAppleProduct,
  plansForWeb,
  type AppleProductMapping,
} from '@daypilot/lib';
import { AuditService } from '../audit/audit.service';
import { ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';
import { resolveJwtSecret } from '../common/jwt-secret';
import { PrismaService } from '../prisma/prisma.service';
import type { SubscriptionStatus, SubscriptionTier } from '../generated/prisma';
import {
  type AppleTransaction,
  AppleTransactionError,
  verifyAppleSignedTransaction,
} from './apple-signed-transaction';

export {
  entitlementsForSubscription,
  FREE_BOOKING_LINK_LIMIT,
  FREE_CALENDAR_CONNECTION_LIMIT,
} from '@daypilot/lib';

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
    const claim = await this.prisma.foundingClaim.findFirst({
      where: { userId },
      orderBy: { founderNumber: 'asc' },
    });
    const source = sub.stripeSubscriptionId?.startsWith('apple:')
      ? 'apple'
      : sub.stripeCustomerId
        ? 'stripe'
        : null;
    let status = sub.status ?? 'active';
    if (
      source === 'apple' &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd.getTime() < Date.now()
    ) {
      status = 'canceled';
    }
    const entitlements = entitlementsForSubscription({
      tier: sub.tier,
      planId: sub.planId,
      status,
      currentPeriodEnd: sub.currentPeriodEnd,
    });
    const founderNumber =
      entitlements.planId === 'founding_pro'
        ? (sub.founderNumber ?? claim?.founderNumber ?? null)
        : null;
    return {
      tier: sub.tier,
      status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      stripeCustomerId: sub.stripeCustomerId ?? null,
      source,
      configured: Boolean(this.stripe),
      displayName: formatSubscriptionDisplayName({
        tier: sub.tier,
        planId: sub.planId,
        founderNumber,
      }),
      founderNumber,
      ...entitlements,
    };
  }

  /**
   * Free accounts may add one external calendar. Already-connected calendars
   * are not passed through this check. Pro access removes the cap.
   */
  async assertCanAddCalendarConnection(
    userId: string,
    existingConnectionCount: number,
  ) {
    const sub = await this.getSubscription(userId);
    if (sub.hasProAccess) return;
    const limit = sub.calendarConnectionLimit ?? FREE_CALENDAR_CONNECTION_LIMIT;
    if (existingConnectionCount < limit) return;
    throw new ForbiddenException(
      'Free includes 1 external calendar connection. Upgrade to Pro in the DayPilot iOS app to connect more.',
    );
  }

  /** Marketing catalog. Purchases happen in the iOS app, not via Stripe price IDs. */
  listCatalog() {
    return { plans: plansForWeb() };
  }

  listPlans() {
    return this.listCatalog();
  }

  async getFoundingOffer() {
    const offerEnabled = foundingOfferEnabled(
      this.config.get<string>('FOUNDING_OFFER_ENABLED'),
    );
    const claimedCount = await this.prisma.foundingClaim.count();
    return foundingOfferSnapshot({ claimedCount, offerEnabled });
  }

  /**
   * Confirm a StoreKit 2 purchase. Production requires the signed transaction
   * and checks it against Apple Root CA - G3. APPLE_IAP_SKIP_VERIFY=1 is
   * local Xcode StoreKit only and is ignored in production.
   * Founder numbers come from the verified original transaction id.
   * There is no App Store Server Notification pipeline, so access follows
   * the expiry in the signed transaction.
   */
  async confirmApplePurchase(
    userId: string,
    input: {
      productId: string;
      transactionId: string;
      originalTransactionId?: string;
      signedTransaction?: string;
    },
  ) {
    const verified = this.readApplePurchase(input);
    const appleId = `apple:${verified.originalTransactionId}`;
    const linked = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: appleId },
    });
    if (linked && linked.userId !== userId) {
      throw new BadRequestException(
        'This App Store subscription is already linked to another DayPilot account.',
      );
    }
    const existing = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (
      existing?.stripeSubscriptionId &&
      !existing.stripeSubscriptionId.startsWith('apple:') &&
      existing.status === 'active' &&
      existing.tier !== 'Free'
    ) {
      throw new BadRequestException(
        'This account already has a subscription billed on the website.',
      );
    }

    let founderNumber: number | null = null;
    if (verified.mapping.founding) {
      const reserved = await this.reserveFoundingSpot({
        userId,
        originalTransactionId: verified.originalTransactionId,
        latestTransactionId:
          input.transactionId?.trim() || verified.originalTransactionId,
        productId: verified.productId,
        periodEnd: verified.currentPeriodEnd,
      });
      founderNumber = reserved.founderNumber;
    }

    await this.upsertAppleSubscription({
      userId,
      tier: verified.mapping.tier,
      planId: verified.mapping.planId,
      founderNumber,
      periodEnd: verified.currentPeriodEnd,
      originalTransactionId: verified.originalTransactionId,
    });
    await this.audit.log({
      action: 'billing.apple_purchase_confirmed',
      entityType: 'subscription',
      userId,
      metadata: {
        productId: verified.productId,
        transactionId: verified.originalTransactionId,
        tier: verified.mapping.tier,
        planId: verified.mapping.planId,
        founderNumber,
      },
    });
    return this.getSubscription(userId);
  }

  optionalAccessUserId(req: {
    headers?: { authorization?: string; cookie?: string };
  }): string | null {
    const header = req.headers?.authorization;
    const bearer = header?.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : '';
    const token =
      bearer || readCookie(req.headers?.cookie, ACCESS_COOKIE) || '';
    if (!token) return null;
    try {
      const payload = jwt.verify(
        token,
        resolveJwtSecret(this.config.get<string>('JWT_SECRET')),
      ) as { sub?: string; type?: string };
      if (payload.type !== 'access' || !payload.sub) return null;
      return payload.sub;
    } catch {
      return null;
    }
  }

  private readApplePurchase(input: {
    productId: string;
    transactionId: string;
    signedTransaction?: string;
  }): {
    mapping: AppleProductMapping;
    productId: string;
    originalTransactionId: string;
    currentPeriodEnd: Date;
  } {
    const skip =
      this.config.get<string>('APPLE_IAP_SKIP_VERIFY') === '1' &&
      this.config.get<string>('NODE_ENV') !== 'production';
    if (skip && !input.signedTransaction?.trim()) {
      const mapping = this.appleProductMapping(input.productId);
      if (!mapping) {
        throw new BadRequestException(
          `Unknown App Store product: ${input.productId}`,
        );
      }
      if (!input.transactionId?.trim()) {
        throw new BadRequestException('Missing transactionId');
      }
      return {
        mapping,
        productId: input.productId,
        originalTransactionId:
          input.transactionId.trim(),
        currentPeriodEnd: new Date(
          Date.now() + APPLE_CONFIRM_PERIOD_DAYS * 24 * 60 * 60 * 1000,
        ),
      };
    }
    if (!input.signedTransaction?.trim()) {
      throw new BadRequestException('Missing App Store signed transaction');
    }
    let transaction: AppleTransaction;
    try {
      transaction = verifyAppleSignedTransaction(
        input.signedTransaction.trim(),
      );
    } catch (error) {
      if (error instanceof AppleTransactionError) {
        throw new BadRequestException(
          'App Store purchase could not be verified',
        );
      }
      throw error;
    }
    const bundleId =
      this.config.get<string>('APPLE_BUNDLE_ID') ?? 'com.dekuworks.daypilot';
    if (
      transaction.bundleId !== bundleId ||
      transaction.productId !== input.productId
    ) {
      throw new BadRequestException('App Store purchase could not be verified');
    }
    const mapping = this.appleProductMapping(transaction.productId);
    if (!mapping) {
      throw new BadRequestException(
        `Unknown App Store product: ${transaction.productId}`,
      );
    }
    if (transaction.revocationDate) {
      throw new BadRequestException('This App Store purchase was revoked');
    }
    if (transaction.environment !== 'Production') {
      const sandbox =
        transaction.environment === 'Sandbox' &&
        this.config.get<string>('APPLE_IAP_ACCEPT_SANDBOX') === '1';
      if (!sandbox) {
        throw new BadRequestException(
          'Sandbox App Store purchases are not accepted',
        );
      }
    }
    if (!transaction.expiresDate || transaction.expiresDate <= Date.now()) {
      throw new BadRequestException(
        'This App Store subscription is not active',
      );
    }
    return {
      mapping,
      productId: transaction.productId,
      originalTransactionId: transaction.originalTransactionId,
      currentPeriodEnd: new Date(transaction.expiresDate),
    };
  }

  async joinWaitlist(
    userId: string | null,
    input: {
      email: string;
      requestedPlan: 'team' | 'enterprise';
      companyName?: string;
      teamSize?: string;
      marketingConsent?: boolean;
    },
  ) {
    const email = input.email.trim().toLowerCase();
    const requestedPlan = input.requestedPlan;
    const companyName = input.companyName?.trim() || null;
    const teamSize = input.teamSize?.trim() || null;
    const marketingConsent = input.marketingConsent === true;
    const existing = await this.prisma.planWaitlistEntry.findUnique({
      where: { email_requestedPlan: { email, requestedPlan } },
    });
    if (existing) {
      await this.prisma.planWaitlistEntry.update({
        where: { id: existing.id },
        data: {
          companyName,
          teamSize,
          marketingConsent,
          ...(userId ? { userId } : {}),
        },
      });
    } else {
      await this.prisma.planWaitlistEntry.create({
        data: {
          email,
          requestedPlan,
          companyName,
          teamSize,
          marketingConsent,
          userId,
        },
      });
    }
    return { ok: true, requestedPlan };
  }

  private appleProductMapping(productId: string): AppleProductMapping | null {
    return mapAppleProduct(productId, {
      founding: this.config.get<string>('APPLE_PRODUCT_FOUNDING'),
      pro: this.config.get<string>('APPLE_PRODUCT_PRO'),
      personal: this.config.get<string>('APPLE_PRODUCT_PERSONAL'),
      business: this.config.get<string>('APPLE_PRODUCT_BUSINESS'),
      enterprise: this.config.get<string>('APPLE_PRODUCT_ENTERPRISE'),
    });
  }

  /**
   * Locks founding rows, then applies decideFoundingClaim. A repeat confirm
   * for the same original transaction renews. A 26th new transaction is
   * rejected. An expired claim stays in the table.
   */
  private async reserveFoundingSpot(input: {
    userId: string;
    originalTransactionId: string;
    latestTransactionId: string;
    productId: string;
    periodEnd: Date;
  }) {
    const offerEnabled = foundingOfferEnabled(
      this.config.get<string>('FOUNDING_OFFER_ENABLED'),
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(21480025)`;
      const rows = await tx.foundingClaim.findMany();
      const decision = decideFoundingClaim({
        claims: rows.map((row) => ({
          id: row.id,
          founderNumber: row.founderNumber,
          originalTransactionId: row.originalTransactionId,
          userId: row.userId,
          periodEnd: row.periodEnd,
        })),
        userId: input.userId,
        originalTransactionId: input.originalTransactionId,
        now: new Date(),
        offerEnabled,
      });
      if (decision.action === 'reject') {
        const message =
          decision.reason === 'closed'
            ? 'Founding 25 is closed. Pro is the paid plan.'
            : decision.reason === 'lost'
              ? 'The founding rate ended with that subscription and cannot be reclaimed.'
              : 'That App Store transaction is already linked to another DayPilot account.';
        throw new BadRequestException(message);
      }
      if (decision.action === 'renew') {
        await tx.foundingClaim.update({
          where: { id: decision.claimId },
          data: {
            latestTransactionId: input.latestTransactionId,
            productId: input.productId,
            periodEnd: input.periodEnd,
            userId: input.userId,
          },
        });
        return { founderNumber: decision.founderNumber };
      }
      await tx.foundingClaim.create({
        data: {
          founderNumber: decision.founderNumber,
          originalTransactionId: input.originalTransactionId,
          latestTransactionId: input.latestTransactionId,
          userId: input.userId,
          productId: input.productId,
          periodEnd: input.periodEnd,
        },
      });
      return { founderNumber: decision.founderNumber };
    });
  }

  private async upsertAppleSubscription(input: {
    userId: string;
    tier: SubscriptionTier;
    planId: string;
    founderNumber: number | null;
    periodEnd: Date;
    originalTransactionId: string;
  }) {
    const existing = await this.prisma.subscription.findFirst({
      where: { userId: input.userId },
      orderBy: { updatedAt: 'desc' },
    });
    const data = {
      tier: input.tier,
      planId: input.planId,
      founderNumber: input.founderNumber,
      status: 'active' as SubscriptionStatus,
      stripeSubscriptionId: `apple:${input.originalTransactionId}`,
      currentPeriodEnd: input.periodEnd,
    };
    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data,
      });
      return;
    }
    await this.prisma.subscription.create({
      data: { userId: input.userId, ...data },
    });
  }

  async createCheckoutSession(
    _userId: string,
    _userEmail: string,
    _priceId: string,
  ): Promise<{ url: string | null }> {
    throw new BadRequestException(
      'Subscriptions are purchased in the DayPilot iOS app.',
    );
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
