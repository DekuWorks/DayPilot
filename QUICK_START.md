# Quick Start - Supabase Setup

## ⚡ Quick Fix for "Supabase not configured" Error

You need to create a `.env` file with your Supabase credentials.

### Step 1: Get Your Supabase Credentials

1. **Go to your Supabase project**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Click Settings** (gear icon) → **API**
3. **Copy these two values**:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 2: Create `.env` File

Create a file at: `apps/web/.env`

```bash
# From the apps/web directory:
touch .env
```

Then add this content (replace with YOUR values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Restart Dev Server

After creating the `.env` file, restart your dev server:

```bash
pnpm dev
```

---

## 🆕 Don't Have a Supabase Project Yet?

### Option 1: Create New Project (Recommended)

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: `daypilot` (or any name)
   - **Database Password**: Generate and save it!
   - **Region**: Choose closest to you
5. Wait 2-3 minutes for setup
6. Follow Step 1 above to get credentials

### Option 2: Use Local Supabase (Advanced)

If you have Supabase CLI installed:

```bash
# Start local Supabase
supabase start

# Get local credentials
supabase status
```

Use the local URL and anon key in your `.env` file.

---

## ✅ Verify It Works

After setting up `.env`, you should be able to:

- Click "Get Started" without the error
- Sign up for a new account
- Log in

---

## 📝 Need More Help?

See `SUPABASE_SETUP_GUIDE.md` for detailed setup instructions including database migrations.
