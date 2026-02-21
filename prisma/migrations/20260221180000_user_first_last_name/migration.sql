-- Add first_name and last_name (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT;

-- Backfill from name: first word -> first_name, rest -> last_name; if no name use 'User' and ''
UPDATE "users" SET
  "first_name" = COALESCE(NULLIF(TRIM(SPLIT_PART(COALESCE("name", ' '), ' ', 1)), ''), 'User'),
  "last_name" = COALESCE(LTRIM(SUBSTRING(COALESCE("name", ' ') FROM LENGTH(SPLIT_PART(COALESCE("name", ' '), ' ', 1)) + 2)), '');

-- Make required
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;

-- Drop old column
ALTER TABLE "users" DROP COLUMN "name";

-- Add Prisma's expected names (schema has @map("first_name") so column is first_name)
-- Columns are already named first_name, last_name above; Prisma maps to firstName/lastName in client.
