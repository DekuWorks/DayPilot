# Notification System Setup Guide

This guide explains how to set up the notification system for DayPilot, including email reminders and booking confirmations.

## Overview

DayPilot uses two Supabase Edge Functions for notifications:
1. **send-reminders** - Sends email reminders for upcoming events
2. **send-booking-confirmation** - Sends confirmation emails when bookings are created

## Prerequisites

1. Supabase project set up
2. Resend account (or another email provider)
3. Supabase CLI installed

## Step 1: Set Up Resend

1. Sign up at [resend.com](https://resend.com)
2. Create an API key in the dashboard
3. Verify your domain (or use Resend's test domain for development)
4. Note your API key and from email address

## Step 2: Deploy Edge Functions

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login and Link Project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Set Environment Variables
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Deploy Functions
```bash
supabase functions deploy send-reminders
supabase functions deploy send-booking-confirmation
```

## Step 3: Set Up Cron Job for Reminders

The reminder function needs to run periodically to check for due reminders. Choose one of these options:

### Option A: Supabase pg_cron (Recommended for Production)

1. Enable pg_cron extension in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Schedule the job (runs every 5 minutes):
```sql
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

### Option B: GitHub Actions

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
      - name: Trigger Reminder Function
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/send-reminders
```

Add secrets to GitHub:
- `SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`

### Option C: Vercel Cron

If deploying to Vercel, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/send-reminders",
    "schedule": "*/5 * * * *"
  }]
}
```

Then create `apps/web/src/pages/api/cron/send-reminders.ts`:

```typescript
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
```

## Step 4: Test the System

### Test Reminder Function

1. Create an event with a reminder set for 1 minute from now
2. Wait for the cron job to run (or trigger manually)
3. Check the email inbox

### Test Booking Confirmation

1. Create a booking through the public booking page
2. Check both the booker's and owner's email inboxes

### Manual Testing

You can manually trigger the functions:

**Reminders:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders
```

**Booking Confirmation:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"bookingId": "BOOKING_ID"}' \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-confirmation
```

## Troubleshooting

### Emails Not Sending

1. Check Resend API key is correct
2. Verify domain is verified in Resend
3. Check Supabase function logs: `supabase functions logs send-reminders`
4. Ensure environment variables are set correctly

### Cron Job Not Running

1. Verify pg_cron extension is enabled
2. Check cron job exists: `SELECT * FROM cron.job;`
3. Check cron job history: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-reminders');`

### Function Errors

Check function logs:
```bash
supabase functions logs send-reminders --tail
supabase functions logs send-booking-confirmation --tail
```

## Production Checklist

- [ ] Resend account created and domain verified
- [ ] API keys set as Supabase secrets
- [ ] Edge functions deployed
- [ ] Cron job configured and tested
- [ ] Test emails sent successfully
- [ ] Monitoring/logging set up
- [ ] Error handling tested

## Next Steps

After setting up notifications:
1. Test with real events and bookings
2. Monitor email delivery rates
3. Set up error alerts
4. Consider adding email templates customization
5. Add unsubscribe functionality (future)
