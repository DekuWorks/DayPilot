# Google sign-in (Supabase Auth / SSO)

DayPilot web + Flutter call `signInWithOAuth({ provider: "google" })`.
If you see `Unsupported provider: provider is not enabled`, Google is still off
in Supabase Auth.

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

## 2. Enable in Supabase (pick one)

### Option A — script (recommended)

```bash
./scripts/configure-google-auth.sh \
  --client-id 'YOUR_ID.apps.googleusercontent.com' \
  --client-secret 'YOUR_SECRET'
```

This sets env vars and runs `supabase config push` with Google enabled.
Add `--also-calendar` to write the same values into repo-root `.env` for Nest calendar sync (separate redirect URI still required for calendar — see calendar doc).

### Option B — Dashboard

1. Open [Supabase → Authentication → Providers → Google](https://supabase.com/dashboard/project/wmkytyrcxbzjqiykbauw/auth/providers).
2. Enable Google.
3. Paste Client ID + Client secret.
4. Save.

### URL configuration (already pushed for DayPilot)

| Setting | Value |
|---------|-------|
| Site URL | `https://www.daypilot.co` |
| Redirect URLs | `https://www.daypilot.co/**`, `https://daypilot.co/**`, `http://localhost:3000/**`, `com.daypilot.daypilot://login-callback/` |

- Web callback: `/auth/callback`
- Mobile deep link: `com.daypilot.daypilot://login-callback/` (iOS URL scheme + Android intent-filter)

## 3. Verify

**Web**

1. Open `https://www.daypilot.co/login`.
2. Click **Continue with Google**.
3. Complete consent → land on `/dashboard`.

**iOS simulator / device**

1. Open DayPilot → **Continue with Google**.
2. Complete consent in Safari.
3. App should reopen via the deep link and land on Home.

## Calendar sync vs Sign-in

| Feature | Where credentials live | Doc |
|---------|------------------------|-----|
| **Sign in with Google** | Supabase Auth → Google provider | this file |
| **Google Calendar sync** | Nest API `.env` `GOOGLE_CLIENT_ID` / `SECRET` | [CALENDAR_INTEGRATIONS_SETUP.md](./CALENDAR_INTEGRATIONS_SETUP.md) |

You can reuse the same Google Cloud project, but use **separate OAuth clients** (or at least separate redirect URIs) for Auth vs Calendar API.
