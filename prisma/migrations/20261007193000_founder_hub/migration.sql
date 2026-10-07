-- Founder Hub. Additive only. Do not apply this migration to production from an agent.
-- Does not DROP tables or columns. Does not reopen founding spots.

DO $$ BEGIN
    CREATE TYPE "SuggestionCategory" AS ENUM ('feature_idea', 'improvement', 'bug', 'integration', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SuggestionStatus" AS ENUM ('submitted', 'under_review', 'planned', 'building', 'shipped', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SuggestionMessageKind" AS ENUM ('founder', 'admin_reply', 'internal_note', 'status_change');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "BetaReleaseStage" AS ENUM ('internal_testing', 'founder_beta', 'general_availability');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "FounderNoticeKind" AS ENUM ('founder_message', 'admin_reply', 'status_change', 'beta_available');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "founder_suggestions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'submitted',
    "feature_key" TEXT,
    "content_hash" TEXT NOT NULL,
    "founder_last_read_at" TIMESTAMP(3),
    "owner_last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "founder_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "founder_suggestion_messages" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "kind" "SuggestionMessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_suggestion_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "founder_suggestion_attachments" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_suggestion_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "founder_notices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "FounderNoticeKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "suggestion_id" TEXT,
    "feature_key" TEXT,
    "read_at" TIMESTAMP(3),
    "push_sent_at" TIMESTAMP(3),
    "push_skip_reason" TEXT,
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "founder_notification_preferences" (
    "user_id" TEXT NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "founder_notification_preferences_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "device_push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'fcm',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "beta_features" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stage" "BetaReleaseStage" NOT NULL,
    "platforms" TEXT[] NOT NULL,
    "minimum_app_version" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "founder_available_at" TIMESTAMP(3),
    "general_available_at" TIMESTAMP(3),
    "plan_entitlement" TEXT NOT NULL,
    "changes_scheduling" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "beta_features_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "founder_beta_opt_outs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_beta_opt_outs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "founder_suggestions_user_id_created_at_idx"
    ON "founder_suggestions"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "founder_suggestions_content_hash_idx"
    ON "founder_suggestions"("content_hash");
CREATE INDEX IF NOT EXISTS "founder_suggestions_status_idx"
    ON "founder_suggestions"("status");
CREATE INDEX IF NOT EXISTS "founder_suggestions_category_idx"
    ON "founder_suggestions"("category");
CREATE INDEX IF NOT EXISTS "founder_suggestion_messages_suggestion_id_created_at_idx"
    ON "founder_suggestion_messages"("suggestion_id", "created_at");
CREATE INDEX IF NOT EXISTS "founder_suggestion_attachments_suggestion_id_idx"
    ON "founder_suggestion_attachments"("suggestion_id");
CREATE INDEX IF NOT EXISTS "founder_notices_user_id_read_at_idx"
    ON "founder_notices"("user_id", "read_at");
CREATE INDEX IF NOT EXISTS "founder_notices_suggestion_id_idx"
    ON "founder_notices"("suggestion_id");
CREATE UNIQUE INDEX IF NOT EXISTS "device_push_tokens_token_key"
    ON "device_push_tokens"("token");
CREATE INDEX IF NOT EXISTS "device_push_tokens_user_id_idx"
    ON "device_push_tokens"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "founder_beta_opt_outs_user_id_feature_key_key"
    ON "founder_beta_opt_outs"("user_id", "feature_key");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_suggestions_user_id_fkey') THEN
        ALTER TABLE "founder_suggestions"
            ADD CONSTRAINT "founder_suggestions_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_suggestion_messages_suggestion_id_fkey') THEN
        ALTER TABLE "founder_suggestion_messages"
            ADD CONSTRAINT "founder_suggestion_messages_suggestion_id_fkey"
            FOREIGN KEY ("suggestion_id") REFERENCES "founder_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_suggestion_messages_author_user_id_fkey') THEN
        ALTER TABLE "founder_suggestion_messages"
            ADD CONSTRAINT "founder_suggestion_messages_author_user_id_fkey"
            FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_suggestion_attachments_suggestion_id_fkey') THEN
        ALTER TABLE "founder_suggestion_attachments"
            ADD CONSTRAINT "founder_suggestion_attachments_suggestion_id_fkey"
            FOREIGN KEY ("suggestion_id") REFERENCES "founder_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_suggestion_attachments_user_id_fkey') THEN
        ALTER TABLE "founder_suggestion_attachments"
            ADD CONSTRAINT "founder_suggestion_attachments_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_notices_user_id_fkey') THEN
        ALTER TABLE "founder_notices"
            ADD CONSTRAINT "founder_notices_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_notices_suggestion_id_fkey') THEN
        ALTER TABLE "founder_notices"
            ADD CONSTRAINT "founder_notices_suggestion_id_fkey"
            FOREIGN KEY ("suggestion_id") REFERENCES "founder_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_notification_preferences_user_id_fkey') THEN
        ALTER TABLE "founder_notification_preferences"
            ADD CONSTRAINT "founder_notification_preferences_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_push_tokens_user_id_fkey') THEN
        ALTER TABLE "device_push_tokens"
            ADD CONSTRAINT "device_push_tokens_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_beta_opt_outs_user_id_fkey') THEN
        ALTER TABLE "founder_beta_opt_outs"
            ADD CONSTRAINT "founder_beta_opt_outs_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- One real founder-beta gate on the existing schedule suggester.
-- Kill switch: set enabled = false. This does not change anyone's plan tier.
INSERT INTO "beta_features" (
    "key",
    "name",
    "description",
    "stage",
    "platforms",
    "enabled",
    "founder_available_at",
    "plan_entitlement",
    "changes_scheduling",
    "created_at",
    "updated_at"
) VALUES (
    'schedule_buffer',
    'Schedule buffer',
    'When DayPilot suggests times, founder beta leaves a short gap between events so the day is easier to change. Turn it off if you want the usual suggestions.',
    'founder_beta',
    ARRAY['web', 'ios']::TEXT[],
    true,
    CURRENT_TIMESTAMP,
    'pro',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("key") DO NOTHING;
