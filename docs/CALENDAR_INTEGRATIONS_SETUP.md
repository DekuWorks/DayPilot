# Calendar integrations setup (Google & Outlook)

Connect Google Calendar and Outlook/Microsoft 365 to DayPilot. Events sync **into** DayPilot on connect/sync, and edits or deletes in DayPilot **push back** to the provider (two-way sync).

## Prerequisites

- Nest API running locally on **port 3001**
- Web app on **port 3002** (or 3000 — set `FRONTEND_URL` to match)
- PostgreSQL with Prisma migrations applied

## 1. Configure `.env` (repo root)

Copy from `.env.example` if needed, then set:

```env
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3002

# Comma-separated origins for CORS (include web + Flutter dev if needed)
CORS_ORIGIN="http://localhost:3000,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3002"

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

Production redirect examples:

| Provider | Production redirect URI |
|----------|-------------------------|
| Google   | `https://<your-api-host>/calendar-connections/google/callback` |
| Outlook  | `https://<your-api-host>/calendar-connections/outlook/callback` |

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

1. Sign in on web (`/integrations`) or mobile (link icon → Connected calendars).
2. Click **Connect** on Google Calendar.
3. Approve OAuth; you are redirected back with events syncing automatically.

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
| Events don’t appear after connect | Check API logs; run **Sync now** on Integrations |
| Mobile connect completes in browser but app empty | Return to app (connections refresh on resume) or tap **Sync now** |

## 6. Apple / iCloud

Not yet supported. The Integrations UI shows a placeholder; CalDAV integration is planned.
