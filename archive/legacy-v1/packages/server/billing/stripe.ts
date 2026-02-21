import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(
  priceId: string,
  userId: string,
  userEmail: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    metadata: {
      user_id: userId,
    },
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing?success=true`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing?canceled=true`,
  });

  return session;
}

/**
 * Create a Stripe Customer Portal Session
 */
export async function createPortalSession(
  customerId: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing`,
  });

  return session;
}

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<Stripe.Customer> {
  // First, check if customer exists in our database
  // This would be done via Supabase, but for now we'll search Stripe
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
    },
  });

  return customer;
}
