# Quick Start: Deploy to Production

This is a condensed guide for deploying DayPilot. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 1. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order:
   ```sql
   -- Run these in Supabase SQL Editor:
   -- 001_initial_schema.sql
   -- 002_core_calendar_features.sql
   -- 003_organizations_teams_franchises.sql
   -- 004_booking_links.sql
   ```
3. Get your credentials:
   - Project URL → `VITE_SUPABASE_URL`
   - anon key → `VITE_SUPABASE_ANON_KEY`
   - service_role key → For Edge Functions

## 2. Set Up Resend (Email)

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify domain (or use test domain)
4. Note your API key

## 3. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com

# Deploy
supabase functions deploy send-reminders
supabase functions deploy send-booking-confirmation
```

## 4. Set Up Cron Job

In Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

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

## 5. Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## 6. Test Everything

- [ ] Sign up a test user
- [ ] Create an event with reminder
- [ ] Create a booking link
- [ ] Book through public page
- [ ] Verify emails received
- [ ] Check reminder cron job runs

## That's It! 🎉

Your DayPilot instance should now be live. See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for a complete checklist.
