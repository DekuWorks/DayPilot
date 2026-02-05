-- Run this in Supabase SQL Editor to grant pro/unlimited entitlements to dekuworks1@gmail.com
-- User UID: 794062a9-8191-4cb4-8440-126bfc1c87aa

INSERT INTO public.entitlements (
  user_id,
  tier,
  ai_enabled,
  ai_credits,
  max_connected_calendars,
  sync_frequency_minutes,
  booking_links_enabled
)
VALUES (
  '794062a9-8191-4cb4-8440-126bfc1c87aa'::uuid,
  'pro',
  true,
  -1,
  999,
  15,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  ai_enabled = EXCLUDED.ai_enabled,
  ai_credits = EXCLUDED.ai_credits,
  max_connected_calendars = EXCLUDED.max_connected_calendars,
  sync_frequency_minutes = EXCLUDED.sync_frequency_minutes,
  booking_links_enabled = EXCLUDED.booking_links_enabled,
  updated_at = NOW();
