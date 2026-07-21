# Google sign-in (Supabase Auth)

DayPilot web login/signup already call `signInWithOAuth({ provider: "google" })`.
Google stays disabled until you add OAuth credentials in **Supabase Auth**.

## 1. Create a Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select project **DayPilot**.
3. **APIs & Services → OAuth consent screen**
   - External (or Internal for Workspace)
   - App name: **DayPilot**
   - Authorized domains: `daypilot.co`, `supabase.co`
   - Add yourself as a test user while in Testing
4. **Credentials → Create credentials → OAuth client ID**
   - Type: **Web application**
   - Name: **DayPilot Supabase Auth**
   - **Authorized JavaScript origins**
     - `https://www.daypilot.co`
     - `https://daypilot.co`
     - `http://localhost:3000` (local)
   - **Authorized redirect URIs** (Supabase callback — required)
     - `https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client secret**.

## 2. Enable in Supabase

1. Open [Supabase → Authentication → Providers → Google](https://supabase.com/dashboard/project/wmkytyrcxbzjqiykbauw/auth/providers).
2. Enable Google.
3. Paste Client ID + Client secret.
4. Save.

Confirm **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://www.daypilot.co` |
| Redirect URLs | `https://www.daypilot.co/**`, `https://daypilot.co/**`, `http://localhost:3000/**` |

App callback path: `/auth/callback` (already implemented).

## 3. Verify

1. Open `https://www.daypilot.co/login`.
2. Click **Continue with Google**.
3. Complete consent → land on `/dashboard`.

## Calendar sync vs Sign-in

| Feature | Where credentials live | Doc |
|---------|------------------------|-----|
| **Sign in with Google** | Supabase Auth → Google provider | this file |
| **Google Calendar sync** | Nest API `.env` `GOOGLE_CLIENT_ID` / `SECRET` | [CALENDAR_INTEGRATIONS_SETUP.md](./CALENDAR_INTEGRATIONS_SETUP.md) |

You can reuse the same Google Cloud project, but use **separate OAuth clients** (or at least separate redirect URIs) for Auth vs Calendar API.
