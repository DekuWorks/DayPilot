# Deploy Google Calendar Edge Functions

## Step 1: Verify Secrets Are Set

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Verify you have all three:
   - ✅ `GOOGLE_CLIENT_ID`
   - ✅ `GOOGLE_CLIENT_SECRET`
   - ✅ `FRONTEND_URL`

## Step 2: Deploy Edge Functions

You need to deploy three Edge Functions:

### Option A: Using Supabase CLI (if linked)

```bash
# Make sure you're in the project directory
cd /Users/marcusbrown/Desktop/DayPilot

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the functions
supabase functions deploy google-oauth
supabase functions deploy google-discover
supabase functions deploy google-sync
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. For each function, click **"Deploy"** or **"Create function"**:
   - `google-oauth` - Located in `supabase/functions/google-oauth/`
   - `google-discover` - Located in `supabase/functions/google-discover/`
   - `google-sync` - Located in `supabase/functions/google-sync/`

### Option C: Using Supabase CLI (not linked - one-time setup)

If you're not linked to your project:

1. Get your project reference:
   - Go to Supabase Dashboard → Project Settings → General
   - Copy the "Reference ID" (looks like: `abcdefghijklmnop`)

2. Link your project:

   ```bash
   cd /Users/marcusbrown/Desktop/DayPilot
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Deploy functions:
   ```bash
   supabase functions deploy google-oauth
   supabase functions deploy google-discover
   supabase functions deploy google-sync
   ```

## Step 3: Verify Deployment

After deployment, you should see:

- ✅ All three functions listed in Supabase Dashboard → Edge Functions
- ✅ No errors in the deployment logs

## Step 4: Test the Integration

1. Go to your app: `https://daypilot.co/app/integrations`
2. Click **"Connect Google Calendar"**
3. You should be redirected to Google OAuth
4. Authorize the app
5. You should be redirected back and calendars should auto-discover

## Troubleshooting

### "Function not found" error

- Make sure you've deployed all three functions
- Check that function names match exactly

### "OAuth not configured" error

- Verify secrets are set correctly in Supabase Dashboard
- Check secret names are exactly: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`

### "Redirect URI mismatch" error

- Verify redirect URI in Google Cloud Console matches: `https://daypilot.co/app/integrations/google/callback`
- No trailing slashes!

### Functions deploy but don't work

- Check Edge Function logs in Supabase Dashboard
- Verify secrets are accessible (they should be, but double-check)
