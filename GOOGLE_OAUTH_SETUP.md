# Google OAuth Setup for DayPilot

## Step 1: Get Google OAuth Credentials

If you haven't already:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Configure OAuth Consent Screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External"
   - Fill in:
     - App name: "DayPilot"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
   - Save and continue

5. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - **Production**: `https://daypilot.co/app/integrations/google/callback`
     - **Development** (optional): `http://localhost:5174/app/integrations/google/callback`
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these)

## Step 2: Set Supabase Secrets

You have two options:

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're linked to your Supabase project
supabase link --project-ref your-project-ref

# Set the secrets
supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret_here
supabase secrets set FRONTEND_URL=https://daypilot.co
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to "Project Settings" → "Edge Functions" → "Secrets"
3. Add each secret:
   - **Name**: `GOOGLE_CLIENT_ID`, **Value**: (your client ID)
   - **Name**: `GOOGLE_CLIENT_SECRET`, **Value**: (your client secret)
   - **Name**: `FRONTEND_URL`, **Value**: `https://daypilot.co`

## Step 3: Verify Secrets

Check that secrets are set:

```bash
supabase secrets list
```

You should see:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`

## Step 4: Deploy Edge Functions

```bash
supabase functions deploy google-oauth
supabase functions deploy google-discover
supabase functions deploy google-sync
```

## Important Notes

- Make sure the redirect URI in Google Cloud Console **exactly matches**: `https://daypilot.co/app/integrations/google/callback`
- No trailing slashes!
- The redirect URI must match what's in the code (case-sensitive)
