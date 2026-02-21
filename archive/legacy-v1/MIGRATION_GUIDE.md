# DayPilot Supabase Migration Guide

## Overview

This guide explains how to migrate from localStorage-based storage to Supabase persistence, and how to enable email notifications.

## Phase A: Email Notifications Setup

### 1. Resend Account Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to Supabase secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set RESEND_FROM_EMAIL=DayPilot <noreply@yourdomain.com>
supabase secrets set FRONTEND_URL=https://yourdomain.com
```

### 2. Deploy Edge Functions

```bash
# Deploy email functions
supabase functions deploy send-email
supabase functions deploy send-event-invite
supabase functions deploy send-rsvp-update
supabase functions deploy send-booking-confirmation
supabase functions deploy send-reminders
```

### 3. Set Up Reminder Cron

In Supabase SQL Editor, run:

```sql
-- Enable pg_cron extension
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

## Phase B: Supabase Persistence Migration

### 1. Run Database Migration

```bash
# Apply the migration
supabase migration up
```

Or manually run `supabase/migrations/008_mvp_persistence.sql` in Supabase SQL Editor.

### 2. Enable Supabase Storage

Add to `apps/web/.env`:

```env
VITE_USE_SUPABASE_STORAGE=true
```

### 3. Run Data Migration

The migration banner will appear in the dashboard when:

- `VITE_USE_SUPABASE_STORAGE=true` is set
- User is authenticated
- Migration hasn't been completed

Users can click "Migrate Now" to move their localStorage data to Supabase.

### 4. Verify Migration

Check that:

- Events appear in Supabase `events` table
- Tasks appear in `tasks` table
- Attendees appear in `attendees` table
- Share links appear in `share_links` table

## Architecture

### Storage Adapter Pattern

The app uses a storage adapter that automatically switches between localStorage and Supabase:

- **localStorage** (default): Client-side only, works offline
- **Supabase** (when `VITE_USE_SUPABASE_STORAGE=true`): Server-side, syncs across devices

Components don't need to change - they use the same hooks (`getEvents`, `saveEvents`, etc.) and the adapter handles the switching.

### Email Flow

1. **Event Invite**: When attendee is added → `send-event-invite` Edge Function
2. **RSVP Update**: When RSVP changes → `send-rsvp-update` Edge Function
3. **Booking Confirmation**: When booking created → `send-booking-confirmation` Edge Function
4. **Reminders**: Scheduled via `send-reminders` Edge Function (runs every 5 minutes)

## Testing

### Test Email Functions Locally

```bash
# Serve functions locally
supabase functions serve send-event-invite

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/send-event-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"attendeeId": "test-id"}'
```

### Test Storage Migration

1. Create some events/tasks in localStorage mode
2. Set `VITE_USE_SUPABASE_STORAGE=true`
3. Reload app - migration banner should appear
4. Click "Migrate Now"
5. Verify data appears in Supabase tables

## Rollback

If you need to rollback to localStorage:

1. Remove `VITE_USE_SUPABASE_STORAGE` from `.env`
2. Data will automatically use localStorage again
3. Supabase data remains intact for future migration

## Next Steps

- [ ] Set up Resend account and API key
- [ ] Deploy Edge Functions
- [ ] Set up reminder cron job
- [ ] Test email delivery
- [ ] Run database migration
- [ ] Enable Supabase storage for beta users
- [ ] Monitor migration success rate
