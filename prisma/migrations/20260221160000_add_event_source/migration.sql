-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('native', 'google', 'outlook', 'booking');

-- AlterTable
ALTER TABLE "events" ADD COLUMN "source" "EventSource" NOT NULL DEFAULT 'native';
ALTER TABLE "events" ADD COLUMN "external_id" TEXT;

-- CreateIndex
CREATE INDEX "events_user_id_start_idx" ON "events"("user_id", "start");

-- CreateIndex (unique on source+external_id; multiple (native, NULL) allowed in PostgreSQL)
CREATE UNIQUE INDEX "events_source_external_id_key" ON "events"("source", "external_id");
