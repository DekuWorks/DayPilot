-- Waitlist status for the owner people list. Additive. Do not apply from an agent
-- against production; the API deploy runs migrations.

ALTER TABLE "plan_waitlist" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'open';
