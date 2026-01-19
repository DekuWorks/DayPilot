# Supabase Edge Functions

This directory contains Supabase Edge Functions for DayPilot.

## Functions

### `create-checkout-session`
Creates a Stripe Checkout Session for subscription upgrades.

**Environment Variables Required:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `FRONTEND_URL` - Your frontend URL (for redirects)
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

**Request Body:**
```json
{
  "priceId": "price_xxxxx",
  "tier": "student"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Deployment:**
```bash
supabase functions deploy create-checkout-session
```

### `create-portal-session`
Creates a Stripe Customer Portal Session for subscription management.

**Environment Variables Required:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `FRONTEND_URL` - Your frontend URL (for redirects)

**Request Body:**
```json
{
  "customerId": "cus_xxxxx"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Deployment:**
```bash
supabase functions deploy create-portal-session
```

### `stripe-webhook`
Handles Stripe webhook events for subscription lifecycle.

**Environment Variables Required:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

**Events Handled:**
- `checkout.session.completed` - Creates customer and subscription
- `customer.subscription.created` - Updates entitlements
- `customer.subscription.updated` - Updates entitlements
- `customer.subscription.deleted` - Resets to free tier

**Deployment:**
```bash
supabase functions deploy stripe-webhook
```

**Webhook Setup:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events listed above
4. Copy webhook secret → Set as `STRIPE_WEBHOOK_SECRET`

### `generate-day`
Generates an AI-powered schedule for a user's day based on existing events and backlog tasks.

**Environment Variables Required:**
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided
- `OPENAI_API_KEY` - Optional (for future AI integration)
- `ANTHROPIC_API_KEY` - Optional (for future AI integration)

**Request Body:**
```json
{
  "date": "2024-01-15", // Optional, defaults to today
  "backlog_tasks": [
    {
      "title": "Review project proposal",
      "description": "Need to review and provide feedback",
      "priority": "high",
      "estimated_duration": 60
    }
  ]
}
```

**Response:**
```json
{
  "action_id": "uuid",
  "blocks": [
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:00:00Z",
      "title": "Review project proposal",
      "type": "task",
      "reason": "Scheduled based on priority: high"
    }
  ],
  "conflicts": [],
  "notes": [],
  "existing_events": 2,
  "new_blocks": 3
}
```

**Features:**
- Validates AI entitlement (ai_enabled OR ai_credits > 0)
- Considers existing events
- Respects working hours
- Handles conflicts
- Creates draft AI action

**Deployment:**
```bash
supabase functions deploy generate-day
```

### `send-reminders`
Sends email reminders for events that are due. This function should be called periodically (via cron job) to check for reminders that need to be sent.

**Environment Variables Required:**
- `RESEND_API_KEY` - Your Resend API key
- `RESEND_FROM_EMAIL` - Email address to send from (e.g., `noreply@daypilot.app`)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for bypassing RLS)

**How it works:**
1. Queries all unsent reminders
2. Filters reminders that are due (event start time - minutes_before <= now)
3. Sends email notifications via Resend
4. Marks reminders as sent

**Deployment:**
```bash
supabase functions deploy send-reminders
```

**Set up cron job:**
You can use Supabase Cron (pg_cron) or an external service like:
- GitHub Actions (scheduled workflows)
- Vercel Cron Jobs
- Inngest
- Trigger.dev

Example cron schedule: Every 5 minutes
```sql
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### `send-booking-confirmation`
Sends confirmation emails when a booking is created. This function is called automatically when a booking is confirmed.

**Environment Variables Required:**
- `RESEND_API_KEY` - Your Resend API key
- `RESEND_FROM_EMAIL` - Email address to send from
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

**How it works:**
1. Receives booking ID in request body
2. Fetches booking details including booker and owner information
3. Sends confirmation email to booker
4. Sends notification email to booking link owner

**Deployment:**
```bash
supabase functions deploy send-booking-confirmation
```

**Usage:**
This function is called automatically from the `useCreateBooking` hook when a booking is created.

## Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Set environment variables
Set the following secrets in your Supabase project:
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set RESEND_FROM_EMAIL=noreply@daypilot.app
```

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### 5. Deploy functions
```bash
supabase functions deploy send-reminders
supabase functions deploy send-booking-confirmation
```

### 6. Set up cron job for reminders

**Option A: Using Supabase SQL Editor**
Run this SQL in your Supabase SQL Editor (requires pg_cron extension):
```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule reminder sending every 5 minutes
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Option B: Using GitHub Actions**
Create `.github/workflows/send-reminders.yml`:
```yaml
name: Send Reminders
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Reminder Function
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders
```

**Option C: Using Vercel Cron**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/send-reminders",
    "schedule": "*/5 * * * *"
  }]
}
```

## Email Provider Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain (or use Resend's test domain for development)
4. Add the API key as a Supabase secret

## Testing

### Test send-reminders function locally:
```bash
supabase functions serve send-reminders
```

Then in another terminal:
```bash
curl -X POST http://localhost:54321/functions/v1/send-reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Test send-booking-confirmation function:
```bash
curl -X POST http://localhost:54321/functions/v1/send-booking-confirmation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"bookingId": "YOUR_BOOKING_ID"}'
```
