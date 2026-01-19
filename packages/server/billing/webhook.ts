import { stripe } from './stripe';
import { createClient } from '@supabase/supabase-js';
import type { Stripe } from 'stripe';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
    return;
  }

  const userId = session.metadata?.user_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  // Upsert stripe customer
  await supabase
    .from('stripe_customers')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
    }, {
      onConflict: 'user_id',
    });

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(subscription, userId);
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) return;

  await upsertSubscription(subscription, userId);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) return;

  await upsertSubscription(subscription, userId);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription);
  if (!userId) return;

  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id);

  // Reset entitlements to free tier
  await supabase
    .from('entitlements')
    .upsert({
      user_id: userId,
      tier: 'free',
      ai_enabled: false,
      ai_credits: 0,
      max_connected_calendars: 1,
      sync_frequency_minutes: 60,
    }, {
      onConflict: 'user_id',
    });
}

/**
 * Upsert subscription and entitlements
 */
async function upsertSubscription(subscription: Stripe.Subscription, userId: string): Promise<void> {
  // Get tier from price metadata or default
  const priceId = subscription.items.data[0]?.price.id;
  const price = priceId ? await stripe.prices.retrieve(priceId) : null;
  const tier = price?.metadata?.tier || 'student';

  // Map tier to entitlements
  const entitlements = getEntitlementsForTier(tier);

  // Upsert subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      tier,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'stripe_subscription_id',
    });

  // Upsert entitlements
  await supabase
    .from('entitlements')
    .upsert({
      user_id: userId,
      tier,
      ...entitlements,
    }, {
      onConflict: 'user_id',
    });
}

/**
 * Get user ID from subscription
 */
async function getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  // Get from stripe_customers table
  const { data } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  return data?.user_id || null;
}

/**
 * Get entitlements for a tier
 */
function getEntitlementsForTier(tier: string): {
  ai_enabled: boolean;
  ai_credits: number;
  max_connected_calendars: number;
  sync_frequency_minutes: number;
} {
  switch (tier) {
    case 'student':
      return {
        ai_enabled: false,
        ai_credits: 20,
        max_connected_calendars: 2,
        sync_frequency_minutes: 60,
      };
    case 'team':
      return {
        ai_enabled: true,
        ai_credits: 200,
        max_connected_calendars: 5,
        sync_frequency_minutes: 30,
      };
    case 'enterprise':
      return {
        ai_enabled: true,
        ai_credits: -1, // Unlimited
        max_connected_calendars: 50,
        sync_frequency_minutes: 15,
      };
    default:
      return {
        ai_enabled: false,
        ai_credits: 0,
        max_connected_calendars: 1,
        sync_frequency_minutes: 60,
      };
  }
}
