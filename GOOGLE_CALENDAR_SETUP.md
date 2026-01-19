# Google Calendar Integration Setup Guide

This guide explains how to set up Google Calendar OAuth and sync for DayPilot.

## Prerequisites

1. Google Cloud Project
2. Google Calendar API enabled
3. OAuth 2.0 credentials configured
4. Supabase project set up

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in required information:
   - App name: "DayPilot"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (for development)
6. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:5174/app/integrations/google/callback`
   - Production: `https://yourdomain.com/app/integrations/google/callback`
5. Copy **Client ID** and **Client Secret**

## Step 4: Set Environment Variables

### Supabase Edge Functions
Set these as Supabase secrets:
```bash
supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret_here
supabase secrets set FRONTEND_URL=https://yourdomain.com
```

### Local Development
Create `.env.local` in `supabase/functions/`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=http://localhost:5174
```

## Step 5: Run Database Migration

Run the migration in Supabase SQL Editor:
```sql
-- Run: supabase/migrations/007_google_calendar_sync.sql
```

Or via CLI:
```bash
supabase db push
```

## Step 6: Deploy Edge Functions

```bash
supabase functions deploy google-oauth
supabase functions deploy google-sync
```

## Step 7: Test the Integration

1. Go to `/app/integrations` in your app
2. Click "Connect Google Calendar"
3. Authorize the app in Google
4. You should be redirected back with "Connected" status
5. Click "Sync Now" to import events

## How It Works

### OAuth Flow
1. User clicks "Connect Google Calendar"
2. Redirected to Google OAuth consent screen
3. User authorizes DayPilot
4. Google redirects to callback URL with authorization code
5. Edge function exchanges code for tokens
6. Tokens stored in `connected_accounts` table

### Sync Flow
1. User clicks "Sync Now" on a calendar
2. Edge function fetches events from Google Calendar API
3. Events are mapped to DayPilot events
4. `event_mappings` table tracks Google → DayPilot mapping
5. Sync token stored for incremental syncs

### Token Refresh
- Access tokens expire after 1 hour
- Refresh tokens are used to get new access tokens
- Automatic refresh happens before API calls
- If refresh fails, user needs to reconnect

## Troubleshooting

### "OAuth not configured" Error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify secrets are set in Supabase: `supabase secrets list`

### "Redirect URI mismatch" Error
- Verify redirect URI in Google Cloud Console matches exactly
- Check for trailing slashes or protocol differences
- Development: `http://localhost:5174/app/integrations/google/callback`
- Production: `https://yourdomain.com/app/integrations/google/callback`

### "Token exchange failed" Error
- Check that authorization code hasn't expired (codes expire quickly)
- Verify client ID and secret are correct
- Check Google Cloud Console for API quota limits

### "No calendars synced" Message
- Calendar mappings are created automatically on first sync
- Check that user has calendars in Google Calendar
- Verify sync is enabled in calendar mapping

### Sync Not Working
- Check `sync_state` table for error messages
- Verify access token is valid (not expired)
- Check Google Calendar API quota limits
- Review Edge function logs: `supabase functions logs google-sync --tail`

## Security Notes

- **Never commit** OAuth credentials to git
- Use Supabase secrets for production
- Refresh tokens are stored encrypted in database
- Access tokens expire automatically
- RLS policies ensure users can only access their own data

## Production Checklist

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Redirect URIs added (production URL)
- [ ] Environment variables set in Supabase
- [ ] Database migration run
- [ ] Edge functions deployed
- [ ] Test OAuth flow end-to-end
- [ ] Test sync functionality
- [ ] Verify token refresh works
- [ ] Check RLS policies are working

## Next Steps

After Google Calendar is working:
1. Implement automatic periodic sync (based on `sync_frequency_minutes` in entitlements)
2. Add bidirectional sync (DayPilot → Google)
3. Handle conflict resolution
4. Add support for Outlook and Apple Calendar
