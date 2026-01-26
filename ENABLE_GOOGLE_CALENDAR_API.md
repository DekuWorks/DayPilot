# Step-by-Step: Enable Google Calendar API

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com/**
2. Sign in with your Google account

## Step 2: Create or Select a Project

### If you don't have a project yet:

1. Click the **project dropdown** at the top of the page (next to "Google Cloud")
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: `DayPilot` (or any name you prefer)
   - **Organization**: (leave as default if you don't have one)
   - **Location**: (leave as default)
4. Click **"Create"**
5. Wait a few seconds for the project to be created
6. Select the new project from the dropdown

### If you already have a project:

1. Click the **project dropdown** at the top
2. Select your existing project from the list

## Step 3: Enable Google Calendar API

1. In the left sidebar, click **"APIs & Services"** (or hover over the hamburger menu ☰ and select it)
2. Click **"Library"** (you should see it in the submenu or as a main option)
3. In the search bar at the top, type: **"Google Calendar API"**
4. Click on **"Google Calendar API"** from the search results
5. Click the blue **"Enable"** button
6. Wait a few seconds - you should see a success message saying "API enabled"

## Step 4: Verify API is Enabled

1. Go back to **"APIs & Services"** → **"Library"**
2. In the search bar, type "Calendar" again
3. You should see **"Google Calendar API"** with a checkmark or "Enabled" status

## Step 5: Configure OAuth Consent Screen

Before creating credentials, you need to set up the OAuth consent screen:

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (in the left sidebar)
2. Choose **"External"** (unless you have Google Workspace, then choose "Internal")
3. Click **"Create"**
4. Fill in the **App information**:
   - **App name**: `DayPilot`
   - **User support email**: (select your email from dropdown)
   - **App logo**: (optional - you can skip for now)
   - **App domain**: (optional - you can skip)
   - **Application home page**: `https://daypilot.co`
   - **Privacy policy link**: (optional - you can add later)
   - **Terms of service link**: (optional - you can add later)
   - **Authorized domains**: (optional - you can skip)
   - **Developer contact information**: (enter your email)
5. Click **"Save and Continue"**

## Step 6: Add Scopes

1. On the **"Scopes"** page, click **"Add or Remove Scopes"**
2. In the filter/search box, type: **"calendar"**
3. Check the following scopes:
   - ✅ `https://www.googleapis.com/auth/calendar.readonly`
   - ✅ `https://www.googleapis.com/auth/calendar.events`
4. Click **"Update"**
5. Click **"Save and Continue"**

## Step 7: Add Test Users (for Development)

1. On the **"Test users"** page, click **"Add Users"**
2. Add your email address (and any other test emails)
3. Click **"Add"**
4. Click **"Save and Continue"**

## Step 8: Review and Submit

1. Review the summary
2. Click **"Back to Dashboard"** (you don't need to submit for review if you're in testing mode)

## Step 9: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (in the left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"** from the dropdown
4. If prompted, choose **"Web application"** as the application type
5. Fill in the **OAuth client** details:
   - **Name**: `DayPilot Web Client` (or any name)
   - **Authorized JavaScript origins**: 
     - Click **"+ ADD URI"**
     - Add: `https://daypilot.co`
     - (Optional for local dev): `http://localhost:5174`
   - **Authorized redirect URIs**:
     - Click **"+ ADD URI"**
     - Add: `https://daypilot.co/app/integrations/google/callback`
     - (Optional for local dev): `http://localhost:5174/app/integrations/google/callback`
6. Click **"CREATE"**
7. **IMPORTANT**: A popup will appear with your credentials:
   - **Your Client ID**: (copy this - you'll need it)
   - **Your Client Secret**: (copy this - you'll need it)
   - ⚠️ **Save these somewhere safe!** You won't be able to see the secret again (only reset it)

## Step 10: Save Your Credentials

Copy both values:
- **Client ID**: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

You'll need these in the next step to set up Supabase secrets!

---

## Troubleshooting

### "API not enabled" error
- Make sure you're in the correct Google Cloud project
- Verify the API is enabled in "APIs & Services" → "Enabled APIs"

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console **exactly matches**: `https://daypilot.co/app/integrations/google/callback`
- No trailing slashes!
- Check for typos (case-sensitive)

### Can't see "OAuth client ID" option
- Make sure you've completed the OAuth consent screen setup first
- You need to be in a project with billing enabled (free tier is fine)

### "Access blocked" when testing
- Make sure you added your email as a test user in the OAuth consent screen
- The app needs to be published or you need to be in test mode with test users added
