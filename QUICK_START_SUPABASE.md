# Quick Start: Supabase Setup Checklist

Follow these steps in order to set up your Supabase project.

## ✅ Step 1: Create Project (5 minutes)

- [ ] Go to [supabase.com](https://supabase.com) and sign up
- [ ] Click "New Project"
- [ ] Name: `daypilot`
- [ ] Generate and **SAVE** database password
- [ ] Select region
- [ ] Click "Create new project"
- [ ] Wait for project to initialize (~2 minutes)

## ✅ Step 2: Get Credentials (2 minutes)

- [ ] Go to Settings → API
- [ ] Copy **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copy **anon/public key** (starts with `eyJ...`)
- [ ] Copy **service_role key** (keep secret!)

## ✅ Step 3: Install CLI (2 minutes)

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

- [ ] Run `supabase login`
- [ ] Authenticate in browser

## ✅ Step 4: Link Project (1 minute)

```bash
cd /Users/marcusbrown/Desktop/DayPilot
supabase link --project-ref YOUR_PROJECT_REF
```

- [ ] Find project ref in dashboard URL or run `supabase projects list`

## ✅ Step 5: Run Migrations (2 minutes)

```bash
supabase db push
```

- [ ] Verify no errors
- [ ] Check Table Editor in dashboard - should see all tables

## ✅ Step 6: Configure Frontend (1 minute)

Create `apps/web/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

- [ ] Replace with your actual values from Step 2

## ✅ Step 7: Test Authentication (2 minutes)

- [ ] Start dev server: `pnpm dev` (from project root)
- [ ] Go to `/signup`
- [ ] Create a test account
- [ ] Verify you can log in

## ✅ Step 8: Deploy Edge Functions (5 minutes)

```bash
# Deploy all functions
supabase functions deploy
```

- [ ] Wait for deployment to complete
- [ ] Check Functions tab in dashboard

## ✅ Step 9: Set Function Secrets (3 minutes)

```bash
# Only set these if you have the services configured
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set GOOGLE_CLIENT_ID=xxxxx
supabase secrets set GOOGLE_CLIENT_SECRET=xxxxx
supabase secrets set FRONTEND_URL=http://localhost:5174
```

- [ ] Skip if you don't have Stripe/Google set up yet
- [ ] Can add later when needed

## ✅ Step 10: Verify Setup (2 minutes)

- [ ] Go to `/app/today` (should require login)
- [ ] Create a calendar
- [ ] Create an event
- [ ] Check Table Editor - should see your data

## 🎉 You're Done!

Your Supabase project is now set up. You can:
- Develop locally
- Test all features
- Deploy to production when ready

## Common Issues

**"Project not found"**
- Make sure you're logged in: `supabase login`
- Verify project ref is correct

**"Migration failed"**
- Check you're in the right directory
- Verify Supabase project is active (not paused)

**"Can't connect"**
- Verify `.env.local` has correct URL and key
- Check project is not paused in dashboard

## Next Steps

- Set up Stripe (see `BILLING_SETUP.md`)
- Set up Google Calendar (see `GOOGLE_CALENDAR_SETUP.md`)
- Configure production environment variables
