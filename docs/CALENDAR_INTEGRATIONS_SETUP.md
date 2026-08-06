# Calendar integrations setup (Google, Outlook & Apple EventKit)

Connect Google Calendar and Outlook/Microsoft 365 to DayPilot. Events sync **into** DayPilot on connect/sync, and edits or deletes in DayPilot **push back** to the provider (two-way sync).

**Apple Calendar (product path):** iOS EventKit via the DayPilot Flutter app. The web app displays synced events as **read-only**. Sign in with Apple is account SSO only — it does **not** grant calendar access. App-specific password / CalDAV is **deprecated** for product UX (server code may remain dormant).

## Prerequisites

- Nest API running locally on **port 3001**
- Web app on **port 3000** (set `FRONTEND_URL` to match exactly — wrong port breaks OAuth return)
- PostgreSQL with Prisma migrations applied

## 1. Configure `.env` (repo root)

Copy from `.env.example` if needed, then set:

```env
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Comma-separated origins for CORS (include web + Flutter dev if needed)
CORS_ORIGIN="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"

GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

MICROSOFT_CLIENT_ID="your-azure-application-client-id"
MICROSOFT_CLIENT_SECRET="your-azure-client-secret"
```

Restart the Nest API after changing `.env`.

OAuth redirect URIs (must match **exactly**):

| Provider | Redirect URI |
|----------|--------------|
| Google   | `http://localhost:3001/calendar-connections/google/callback` |
| Outlook  | `http://localhost:3001/calendar-connections/outlook/callback` |

For production, replace `localhost:3001` with your deployed API URL and set `FRONTEND_URL` to `https://www.daypilot.co`.

Production redirect URIs (DayPilot — register on the same Google **Web** OAuth client as Auth, or a dedicated calendar client):

| Provider | Production redirect URI |
|----------|-------------------------|
| Google   | `https://api-production-6c2c.up.railway.app/calendar-connections/google/callback` |
| Google (optional, when DNS ready) | `https://api.daypilot.co/calendar-connections/google/callback` |
| Outlook  | `https://api-production-6c2c.up.railway.app/calendar-connections/outlook/callback` |

Nest builds the Google redirect from Railway `API_URL` + `/calendar-connections/google/callback`. After consent, Nest redirects the browser to `{FRONTEND_URL}/sync?connected=google` (`https://www.daypilot.co/sync`). Mobile Sync refreshes connections when the app resumes.

Also add those URIs in Google Cloud / Azure app settings.

**Sign in with Google** (login button) is separate — see [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md).

---

## 2. Google Calendar

### Create OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. **DayPilot**).
3. **APIs & Services → Library** → enable **Google Calendar API**.
4. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal for Workspace-only testing)
   - App name: **DayPilot**
   - Add scopes:
     - `.../auth/calendar.events`
     - `.../auth/userinfo.email`
   - Add your email as a **test user** while app is in Testing mode.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: **DayPilot local**
   - **Authorized redirect URIs**:  
     `http://localhost:3001/calendar-connections/google/callback`
6. Copy **Client ID** and **Client secret** into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Connect in DayPilot

1. Sign in on web (`/sync` or `/integrations`) or mobile (Profile → **Sync** / Connected calendars).
2. Click **Connect** on Google Calendar.
3. Approve OAuth; you are redirected to **Sync** with events syncing automatically. Use **Validate** to confirm the token is still good.

---

## 3. Outlook / Microsoft 365

### Register an app in Azure

1. Open [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. **New registration**
   - Name: **DayPilot**
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: **Web** →  
     `http://localhost:3001/calendar-connections/outlook/callback`
3. After creation, copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`.
4. **Certificates & secrets → New client secret** → copy value → `MICROSOFT_CLIENT_SECRET`.
5. **API permissions → Add a permission → Microsoft Graph → Delegated**
   - `Calendars.ReadWrite`
   - `openid`, `email`, `offline_access`
   - Click **Grant admin consent** if your tenant requires it.

### Connect in DayPilot

Same flow as Google. If you connected Outlook **before** `Calendars.ReadWrite` was enabled, **disconnect and reconnect** so Microsoft grants write access (required for two-way sync).

---

## 4. How sync works

| Action | Behavior |
|--------|----------|
| Connect | OAuth + initial import (7 days back → 60 days forward) |
| Sync now | Re-imports that window from the provider |
| Edit event in DayPilot | Updates Google/Outlook event via API |
| Delete event in DayPilot | Deletes from Google/Outlook too |
| Disconnect | Removes connection and all imported events for that provider |

Live updates: after sync/disconnect, connected clients receive `calendar:synced` over WebSocket and refresh the calendar.

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| “Google Calendar is not configured” | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and restart API |
| OAuth redirect mismatch | Redirect URI in Google/Azure must match `API_URL` callback exactly |
| Outlook edit fails with 403 | Disconnect Outlook, reconnect (needs `Calendars.ReadWrite`) |
| Events don’t appear after connect | Check API logs; run **Sync now** on Sync (`/sync`) |
| Mobile connect completes in browser but app empty | Return to app (connections refresh on resume) or tap **Sync now** |

## 6. Apple / iCloud

Two different features — do not confuse them:

| Layer | Status | Doc |
|-------|--------|-----|
| **Sign in with Apple** (account SSO) | Client UI shipped; enable in Supabase | [APPLE_AUTH_SETUP.md](./APPLE_AUTH_SETUP.md) |
| **iCloud Calendar sync** (events) | CalDAV import via app-specific password | this section |

### Calendar sync (CalDAV)

### Apple Calendar via EventKit (recommended)

1. Install DayPilot on iPhone; sign in (any method).
2. Profile → **Sync** → **Connect Apple Calendar** (or deep link `com.daypilot.daypilot://integrations/apple-calendar`).
3. Allow full calendar access → select calendars (Google/Outlook device calendars are skipped when those providers are already connected in DayPilot).
4. Initial sync imports roughly −90…+365 days into Nest (`provider=apple_eventkit`, `source=apple_eventkit`).
5. Web **Sync** shows Apple Account vs Apple Calendar separately; calendar events are read-only on web (“Edit in the DayPilot iOS app”).
6. Create/update/delete supported Apple events from iOS only. Disconnect stops sync and never deletes iCloud data.

**API:** `GET/POST/DELETE /calendar-connections/apple/eventkit` (+ `/sync`, `/calendars`).

**Unified calendar:** Nest `GET /events` returns `native` / `google` / `outlook` / `apple` / `apple_eventkit` (soft-deleted rows excluded).

### CalDAV (dormant)

`POST /calendar-connections/apple/connect` (ASP) remains on the server for compatibility but is **not** exposed in Sync UX. Prefer EventKit.
