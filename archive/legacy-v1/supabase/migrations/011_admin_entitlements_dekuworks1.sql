-- Grant admin-level entitlements to dekuworks1@gmail.com (unlimited calendars, pro tier, AI, booking links)
-- Safe to run: if the user does not exist yet, no rows are changed.

INSERT INTO public.entitlements (
  user_id,
  tier,
  ai_enabled,
  ai_credits,
  max_connected_calendars,
  sync_frequency_minutes,
  booking_links_enabled
)
SELECT
  id,
  'pro',
  true,
  -1,
  999,
  15,
  true
FROM auth.users
WHERE email = 'dekuworks1@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  ai_enabled = EXCLUDED.ai_enabled,
  ai_credits = EXCLUDED.ai_credits,
  max_connected_calendars = EXCLUDED.max_connected_calendars,
  sync_frequency_minutes = EXCLUDED.sync_frequency_minutes,
  booking_links_enabled = EXCLUDED.booking_links_enabled,
  updated_at = NOW();
