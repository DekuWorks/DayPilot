-- Enums
ALTER TYPE "EventSource" ADD VALUE IF NOT EXISTS 'apple_eventkit';
ALTER TYPE "CalendarProvider" ADD VALUE IF NOT EXISTS 'apple_eventkit';

CREATE TYPE "ConnectionAuthStatus" AS ENUM ('disconnected', 'connected', 'error');
CREATE TYPE "ConnectionCalendarStatus" AS ENUM ('disconnected', 'permission_required', 'connected', 'denied', 'restricted', 'unavailable', 'error');
CREATE TYPE "ConnectionSyncStatus" AS ENUM ('idle', 'syncing', 'error');
CREATE TYPE "EventSyncState" AS ENUM ('synced', 'pending_create', 'pending_update', 'pending_delete', 'conflict', 'failed');
CREATE TYPE "EventSyncDirection" AS ENUM ('imported', 'exported', 'bidirectional');

-- calendar_connections: device-scoped uniqueness + status fields
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "provider_account_id" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "auth_status" "ConnectionAuthStatus" NOT NULL DEFAULT 'connected';
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "calendar_status" "ConnectionCalendarStatus" NOT NULL DEFAULT 'disconnected';
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "connection_method" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "device_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "sync_status" "ConnectionSyncStatus" NOT NULL DEFAULT 'idle';
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "sync_error" TEXT;

ALTER TABLE "calendar_connections" DROP CONSTRAINT IF EXISTS "calendar_connections_user_id_provider_type_key";
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_user_id_provider_type_device_id_key"
  ON "calendar_connections"("user_id", "provider_type", "device_id");

-- external_calendars
CREATE TABLE IF NOT EXISTS "external_calendars" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "calendar_type" TEXT,
    "source_name" TEXT,
    "color" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_read_only" BOOLEAN NOT NULL DEFAULT false,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "device_id" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_calendars_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "external_calendars_user_id_provider_external_calendar_id_device_id_key"
  ON "external_calendars"("user_id", "provider", "external_calendar_id", "device_id");
CREATE INDEX IF NOT EXISTS "external_calendars_user_id_idx" ON "external_calendars"("user_id");
CREATE INDEX IF NOT EXISTS "external_calendars_connection_id_idx" ON "external_calendars"("connection_id");

ALTER TABLE "external_calendars" DROP CONSTRAINT IF EXISTS "external_calendars_user_id_fkey";
ALTER TABLE "external_calendars" ADD CONSTRAINT "external_calendars_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendars" DROP CONSTRAINT IF EXISTS "external_calendars_connection_id_fkey";
ALTER TABLE "external_calendars" ADD CONSTRAINT "external_calendars_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- calendar_sync_logs
CREATE TABLE IF NOT EXISTS "calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT,
    "provider" "CalendarProvider" NOT NULL,
    "device_id" TEXT,
    "sync_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "events_created" INTEGER NOT NULL DEFAULT 0,
    "events_updated" INTEGER NOT NULL DEFAULT 0,
    "events_deleted" INTEGER NOT NULL DEFAULT 0,
    "events_skipped" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calendar_sync_logs_user_id_idx" ON "calendar_sync_logs"("user_id");
CREATE INDEX IF NOT EXISTS "calendar_sync_logs_connection_id_idx" ON "calendar_sync_logs"("connection_id");

ALTER TABLE "calendar_sync_logs" DROP CONSTRAINT IF EXISTS "calendar_sync_logs_user_id_fkey";
ALTER TABLE "calendar_sync_logs" ADD CONSTRAINT "calendar_sync_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_sync_logs" DROP CONSTRAINT IF EXISTS "calendar_sync_logs_connection_id_fkey";
ALTER TABLE "calendar_sync_logs" ADD CONSTRAINT "calendar_sync_logs_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- events: additive fields + per-user unique
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "external_calendar_id" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "calendar_id" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "all_day" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "recurrence_rule" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sync_state" "EventSyncState" NOT NULL DEFAULT 'synced';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sync_direction" "EventSyncDirection";
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source_updated_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_source_external_id_key";
DROP INDEX IF EXISTS "events_source_external_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "events_user_id_source_external_id_key"
  ON "events"("user_id", "source", "external_id");

CREATE INDEX IF NOT EXISTS "events_calendar_id_idx" ON "events"("calendar_id");
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_calendar_id_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_calendar_id_fkey"
  FOREIGN KEY ("calendar_id") REFERENCES "external_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
