-- Add booking_links_enabled to entitlements table
-- This feature is available for premium subscribers (student, team, enterprise tiers)

-- Add column if it doesn't exist
ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS booking_links_enabled BOOLEAN DEFAULT FALSE;

-- Update existing entitlements based on tier
-- Free tier: booking_links_enabled = FALSE (already default)
-- Paid tiers: booking_links_enabled = TRUE
UPDATE entitlements
SET booking_links_enabled = TRUE
WHERE tier IN ('student', 'team', 'enterprise');
