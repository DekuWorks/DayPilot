-- Launch pricing tables. Do not apply this migration to production from an agent.
-- PostgreSQL 12+ can add enum values inside a transaction when this migration
-- does not insert those values.

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'Pro';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'FoundingPro';

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "founder_number" INTEGER;

CREATE TABLE IF NOT EXISTS "founding_claims" (
    "id" TEXT NOT NULL,
    "founder_number" INTEGER NOT NULL,
    "original_transaction_id" TEXT NOT NULL,
    "latest_transaction_id" TEXT NOT NULL,
    "user_id" TEXT,
    "product_id" TEXT NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "founding_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "founding_claims_founder_number_key"
    ON "founding_claims"("founder_number");
CREATE UNIQUE INDEX IF NOT EXISTS "founding_claims_original_transaction_id_key"
    ON "founding_claims"("original_transaction_id");
CREATE INDEX IF NOT EXISTS "founding_claims_user_id_idx"
    ON "founding_claims"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'founding_claims_user_id_fkey'
    ) THEN
        ALTER TABLE "founding_claims"
            ADD CONSTRAINT "founding_claims_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "plan_waitlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "requested_plan" TEXT NOT NULL,
    "company_name" TEXT,
    "team_size" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_waitlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_waitlist_email_requested_plan_key"
    ON "plan_waitlist"("email", "requested_plan");
CREATE INDEX IF NOT EXISTS "plan_waitlist_requested_plan_idx"
    ON "plan_waitlist"("requested_plan");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plan_waitlist_user_id_fkey'
    ) THEN
        ALTER TABLE "plan_waitlist"
            ADD CONSTRAINT "plan_waitlist_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
