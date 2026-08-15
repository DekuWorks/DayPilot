# Microsoft / Outlook sign-in (Supabase Auth / SSO)

DayPilot web + Flutter call `signInWithOAuth({ provider: "azure" })`.
If you see `Unsupported provider: provider is not enabled`, Azure is still off
in Supabase Auth.

Sign in with Microsoft is **account SSO**. Outlook Calendar sync is a separate
Graph OAuth (or a reuse of the SSO `provider_token` when it includes
`Calendars.ReadWrite`). Do not confuse this with Sign in with Apple or
Apple Calendar (EventKit on iPhone).

## 1. Create an Azure app registration

1. Open [Microsoft Entra admin centre](https://entra.microsoft.com/) →
   **Identity → Applications → App registrations → New registration**.
2. Name: **DayPilot**.
3. Supported account types: **Accounts in any organisational directory and
   personal Microsoft accounts** (`common`).
4. Redirect URI → **Web**:
   - `https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback` — Supabase Auth / SSO
   - `https://api-production-6c2c.up.railway.app/calendar-connections/outlook/callback` — Nest calendar Connect (production)
   - `https://api.daypilot.co/calendar-connections/outlook/callback` — Nest calendar (when custom API DNS is live)
   - `http://localhost:3001/calendar-connections/outlook/callback` — Nest calendar (local)
5. **Certificates & secrets → New client secret** — copy the **value** once.
6. **API permissions → Add a permission → Microsoft Graph → Delegated**:
   - `openid`
   - `email`
   - `profile`
   - `offline_access`
   - `Calendars.ReadWrite` (or `Calendars.Read` if that is all you can get)
7. Grant admin consent if the tenant requires it.
8. Copy **Application (client) ID**.

## 2. Enable in Supabase

1. Open [Supabase → Authentication → Providers → Azure](https://supabase.com/dashboard/project/wmkytyrcxbzjqiykbauw/auth/providers).
2. Enable Azure.
3. Paste **Application (client) ID** and **Client secret**.
4. Azure Tenant URL / Tenant ID: leave as `common` (or your tenant if you
   restrict to one org).
5. Save.

You can also add this block to `supabase/config.toml` and `supabase config push`
once the env vars exist:

```toml
[auth.external.azure]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_AZURE_SECRET)"
```

### URL configuration (same as Google / Apple)

| Setting | Value |
|---------|-------|
| Site URL | `https://www.daypilot.co` |
| Redirect URLs | `https://www.daypilot.co/**`, `https://daypilot.co/**`, `http://localhost:3000/**`, `com.daypilot.daypilot://login-callback/` |

## 3. Nest calendar env (Graph sync)

Reuse the **same Azure app** (or a second app) for Nest. In API `.env` / Railway:

```
MICROSOFT_CLIENT_ID="<application-client-id>"
MICROSOFT_CLIENT_SECRET="<client-secret-value>"
```

Do not commit these. After Microsoft SSO, DayPilot tries the Supabase
`provider_token` first (`POST /calendar-connections/outlook/from-token`).
If that token lacks calendar scopes, Sync → **Connect Outlook** runs the
Nest Graph OAuth (same pattern as Google Calendar).

## 4. Verify

**Web**

1. Open `https://www.daypilot.co/login`.
2. Click **Sign in with Microsoft**.
3. Complete consent → land on `/dashboard`.
4. Open **Sync** — Outlook should show Connected + email, or offer
   **Connect Outlook** once.

**iOS**

1. DayPilot → **Sign in with Microsoft**.
2. Complete consent in Safari.
3. App reopens via `com.daypilot.daypilot://login-callback/`.
4. Outlook auto-connects once per account if tokens allow.

## Calendar sync vs Sign-in

| Feature | Where credentials live | Doc |
|---------|------------------------|-----|
| **Sign in with Microsoft** | Supabase Auth → Azure provider | this file |
| **Outlook Calendar sync** | Nest `MICROSOFT_CLIENT_ID` / `SECRET` | [CALENDAR_INTEGRATIONS_SETUP.md](./CALENDAR_INTEGRATIONS_SETUP.md) |
| **Sign in with Apple** | Supabase Auth → Apple | [APPLE_AUTH_SETUP.md](./APPLE_AUTH_SETUP.md) |
| **Apple Calendar** | EventKit on iPhone | Sync → Connect Apple Calendar |

Paste these values (never commit secrets):

1. Azure **Application (client) ID** → Supabase Azure + `MICROSOFT_CLIENT_ID`
2. Azure **Client secret value** → Supabase Azure + `MICROSOFT_CLIENT_SECRET`
3. Redirect URIs listed in step 1
4. Graph delegated scopes including `Calendars.ReadWrite` (or Read)
