import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or webhook secret' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase, stripe);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, supabase, stripe);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase, stripe);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in stripe-webhook function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe
): Promise<void> {
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
  await upsertSubscription(subscription, userId, supabase, stripe);
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe: Stripe
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription, supabase);
  if (!userId) return;

  await upsertSubscription(subscription, userId, supabase, stripe);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe: Stripe
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription, supabase);
  if (!userId) return;

  await upsertSubscription(subscription, userId, supabase, stripe);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
): Promise<void> {
  const userId = await getUserIdFromSubscription(subscription, supabase);
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

async function upsertSubscription(
  subscription: Stripe.Subscription,
  userId: string,
  supabase: any,
  stripe: Stripe
): Promise<void> {
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

async function getUserIdFromSubscription(
  subscription: Stripe.Subscription,
  supabase: any
): Promise<string | null> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const { data } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  return data?.user_id || null;
}

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
