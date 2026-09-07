-- Additive: link Nest users to the Supabase subject (not email alone).
-- Do not run against production from this agent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supabase_user_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_supabase_user_id_key" ON "users"("supabase_user_id");
