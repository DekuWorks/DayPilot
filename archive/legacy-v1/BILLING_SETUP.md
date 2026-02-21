# Billing Setup Guide

This guide explains how to set up Stripe billing for DayPilot.

## Prerequisites

1. Stripe account (sign up at [stripe.com](https://stripe.com))
2. Supabase project set up
3. Stripe CLI (for local webhook testing)

## Step 1: Create Stripe Products & Prices

1. Go to Stripe Dashboard → Products
2. Create 3 products:

### Student ($5/month)

- Name: "DayPilot Student"
- Price: $5/month (recurring)
- Metadata: `tier: student`
- Description: "Perfect for college students"

### Team ($19/month)

- Name: "DayPilot Team"
- Price: $19/month (recurring)
- Metadata: `tier: team`
- Description: "For small teams & franchises"

### Enterprise ($79/month)

- Name: "DayPilot Enterprise"
- Price: $79/month (recurring)
- Metadata: `tier: enterprise`
- Description: "For large companies"

3. Copy the Price IDs (e.g., `price_1234567890`)

## Step 2: Set Environment Variables

### Frontend (`apps/web/.env`)

```env
VITE_STRIPE_PRICE_ID_STUDENT=price_xxxxx
VITE_STRIPE_PRICE_ID_TEAM=price_xxxxx
VITE_STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```

### Supabase Edge Functions

Set these as Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set FRONTEND_URL=https://yourdomain.com
```

## Step 3: Run Database Migration

Run the migration in Supabase SQL Editor:

```sql
-- Run: supabase/migrations/006_billing_stripe.sql
```

Or via CLI:

```bash
supabase db push
```

## Step 4: Deploy Edge Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

## Step 5: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret → Set as `STRIPE_WEBHOOK_SECRET`

## Step 6: Test the Flow

### Test Checkout

1. Go to `/app/billing`
2. Click "Upgrade" on any tier
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify subscription created in Stripe Dashboard
6. Verify entitlements updated in Supabase

### Test Webhook

1. Use Stripe CLI for local testing:

```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

2. Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

## Tier Entitlements

| Tier       | Price  | AI Enabled | AI Credits | Max Calendars | Sync Frequency |
| ---------- | ------ | ---------- | ---------- | ------------- | -------------- |
| Free       | $0     | ❌         | 0          | 1             | 60 min         |
| Student    | $5/mo  | ❌         | 20/month   | 2             | 60 min         |
| Team       | $19/mo | ✅         | 200/month  | 5             | 30 min         |
| Enterprise | $79/mo | ✅         | Unlimited  | 50            | 15 min         |

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Stripe Dashboard → Webhooks → Events for errors
4. Check Supabase function logs: `supabase functions logs stripe-webhook --tail`

### Entitlements Not Updating

1. Verify webhook is receiving events
2. Check function logs for errors
3. Verify price metadata has `tier` field
4. Check database for subscription/entitlement records

### Checkout Not Working

1. Verify Stripe secret key is set
2. Check price IDs are correct
3. Verify frontend URL is set correctly
4. Check browser console for errors

## Production Checklist

- [ ] Stripe account in live mode
- [ ] Live API keys set as secrets
- [ ] Webhook endpoint configured
- [ ] Price IDs set in environment variables
- [ ] Database migration run
- [ ] Edge functions deployed
- [ ] Test checkout flow
- [ ] Test subscription management
- [ ] Verify entitlements update correctly
