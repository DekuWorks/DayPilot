# Supabase Project Setup Guide for DayPilot

This guide walks you through setting up a new Supabase project from scratch for DayPilot.

## Step 1: Create Supabase Account & Project

1. **Sign up for Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Sign up with GitHub, Google, or email

2. **Create New Project**
   - Click "New Project"
   - Fill in project details:
     - **Name**: `daypilot` (or your preferred name)
     - **Database Password**: Generate a strong password (save this!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Free tier is fine for development
   - Click "Create new project"
   - Wait 2-3 minutes for project to initialize

## Step 2: Get Project Credentials

1. **Go to Project Settings**
   - Click the gear icon (⚙️) in left sidebar
   - Select "API" under "Project Settings"

2. **Copy Important Values**
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

3. **Get Database Connection String**
   - Go to "Database" → "Connection string"
   - Copy "URI" format (includes password)
   - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

## Step 3: Set Up Local Development

1. **Install Supabase CLI**

   ```bash
   # macOS
   brew install supabase/tap/supabase

   # Or via npm
   npm install -g supabase
   ```

2. **Login to Supabase CLI**

   ```bash
   supabase login
   ```

   - This opens browser to authenticate

3. **Link Your Project**

   ```bash
   cd /path/to/DayPilot
   supabase link --project-ref your-project-ref
   ```

   - Find project ref in Supabase dashboard URL: `https://supabase.com/dashboard/project/xxxxx`
   - Or run: `supabase projects list` to see all projects

4. **Verify Connection**

   ```bash
   supabase db remote commit
   ```

   - Should show current database state

## Step 4: Run Database Migrations

1. **Check Migration Files**
   - All migrations are in `supabase/migrations/`
   - Files are numbered: `001_initial_schema.sql`, `002_...`, etc.

2. **Run All Migrations**

   ```bash
   supabase db push
   ```

   - This applies all migrations to your Supabase database
   - Or run individually via Supabase SQL Editor

3. **Verify Tables Created**
   - Go to Supabase Dashboard → "Table Editor"
   - You should see:
     - `profiles`
     - `calendars`
     - `events`
     - `organizations`
     - `stripe_customers`
     - `subscriptions`
     - `entitlements`
     - `connected_accounts`
     - `calendar_mappings`
     - `event_mappings`
     - `sync_state`
     - And more...

## Step 5: Configure Authentication

1. **Enable Email Auth**
   - Go to "Authentication" → "Providers"
   - "Email" should be enabled by default
   - Configure email templates if needed

2. **Set Up Email Templates (Optional)**
   - Go to "Authentication" → "Email Templates"
   - Customize confirmation, password reset emails
   - For development, you can disable email confirmation:
     - Go to "Authentication" → "Settings"
     - Toggle "Enable email confirmations" OFF (dev only!)

3. **Configure Redirect URLs**
   - Go to "Authentication" → "URL Configuration"
   - Add redirect URLs:
     - `http://localhost:5174/**` (development)
     - `https://yourdomain.com/**` (production)

## Step 6: Set Up Edge Functions

1. **Install Deno (if not installed)**
   - Edge Functions use Deno runtime
   - Already included with Supabase CLI

2. **Deploy Functions**

   ```bash
   # Deploy all functions
   supabase functions deploy

   # Or deploy individually
   supabase functions deploy generate-day
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy google-oauth
   supabase functions deploy google-sync
   ```

3. **Set Function Secrets**

   ```bash
   # Set secrets for Edge Functions
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   supabase secrets set GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   supabase secrets set GOOGLE_CLIENT_SECRET=xxxxx
   supabase secrets set FRONTEND_URL=http://localhost:5174
   ```

4. **View Function Logs**
   ```bash
   supabase functions logs generate-day --tail
   ```

## Step 7: Configure Frontend Environment

1. **Create `.env.local` in `apps/web/`**

   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Stripe (optional, for billing)
   VITE_STRIPE_PRICE_ID_STUDENT=price_xxxxx
   VITE_STRIPE_PRICE_ID_TEAM=price_xxxxx
   VITE_STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
   ```

2. **Update `packages/lib/src/supabaseClient.ts`**
   - Should already use environment variables
   - Verify it reads from `import.meta.env.VITE_SUPABASE_URL`

## Step 8: Set Up Row Level Security (RLS)

RLS policies are already in migrations, but verify:

1. **Check RLS is Enabled**
   - Go to "Table Editor" → Select any table
   - Click "Policies" tab
   - Should see policies like "Users can view own X"

2. **Test RLS (Optional)**
   - Create a test user
   - Try querying data - should only see own data

## Step 9: Set Up Storage (If Needed)

1. **Create Storage Bucket**
   - Go to "Storage" → "Buckets"
   - Create bucket (e.g., "avatars", "uploads")
   - Set public/private as needed

2. **Add Storage Policies**
   - Similar to RLS, but for file access
   - Policies are in migrations if needed

## Step 10: Configure Database Functions

1. **Verify Functions Created**
   - Go to "Database" → "Functions"
   - Should see:
     - `get_or_create_entitlements`
     - `update_updated_at_column` (trigger function)

2. **Test Functions (Optional)**
   ```sql
   -- Test in SQL Editor
   SELECT get_or_create_entitlements('user-uuid-here');
   ```

## Step 11: Set Up Local Development Database (Optional)

1. **Start Local Supabase**

   ```bash
   supabase start
   ```

   - This starts local Postgres, Auth, Storage, etc.
   - Useful for offline development

2. **Reset Local Database**

   ```bash
   supabase db reset
   ```

   - Applies all migrations to local DB

3. **Stop Local Supabase**
   ```bash
   supabase stop
   ```

## Step 12: Production Checklist

Before going to production:

- [ ] All migrations run on production database
- [ ] Edge Functions deployed
- [ ] All secrets set in production
- [ ] RLS policies verified
- [ ] Email templates configured
- [ ] Redirect URLs set for production domain
- [ ] Database backups enabled
- [ ] Monitoring/alerts set up
- [ ] Rate limiting configured (if needed)
- [ ] CORS settings configured

## Step 13: Common Commands Reference

```bash
# Database
supabase db push                    # Push migrations to remote
supabase db pull                    # Pull remote schema to local
supabase db reset                   # Reset local database
supabase db diff                    # Show differences

# Functions
supabase functions deploy           # Deploy all functions
supabase functions deploy <name>    # Deploy specific function
supabase functions serve            # Run functions locally
supabase functions logs <name>      # View function logs

# Secrets
supabase secrets list               # List all secrets
supabase secrets set KEY=value      # Set a secret
supabase secrets unset KEY          # Remove a secret

# Local Development
supabase start                      # Start local Supabase
supabase stop                       # Stop local Supabase
supabase status                     # Check local status

# Projects
supabase projects list              # List all projects
supabase link --project-ref xxxx    # Link to project
```

## Troubleshooting

### "Project not found" Error

- Verify project ref is correct
- Check you're logged in: `supabase login`
- List projects: `supabase projects list`

### "Migration failed" Error

- Check migration file syntax
- Verify previous migrations ran successfully
- Check for conflicting changes in database

### "Function deployment failed" Error

- Check Deno syntax in function files
- Verify imports are correct
- Check function logs for errors

### "RLS policy error" Error

- Verify user is authenticated
- Check policy conditions match your query
- Test with service role key (bypasses RLS)

### "Connection refused" Error

- Check Supabase project is active (not paused)
- Verify URL and keys are correct
- Check network/firewall settings

## Next Steps

After setup is complete:

1. **Test Authentication**
   - Create a test user
   - Verify sign up/login works

2. **Test Database Operations**
   - Create a calendar
   - Create an event
   - Verify RLS is working

3. **Test Edge Functions**
   - Call an Edge Function
   - Check logs for errors

4. **Set Up CI/CD** (Optional)
   - Automate migrations
   - Automate function deployments

## Support Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)

---

**Important Notes:**

- Never commit `.env` files or secrets to git
- Use different projects for dev/staging/production
- Keep service role key secret (never expose to frontend)
- Enable database backups in production
- Monitor usage to avoid hitting free tier limits
