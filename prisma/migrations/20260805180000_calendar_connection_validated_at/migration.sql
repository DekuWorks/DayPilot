-- AlterTable
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "validated_at" TIMESTAMP(3);
