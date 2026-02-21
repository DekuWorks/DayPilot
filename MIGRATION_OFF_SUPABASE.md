# Migration Off Supabase

Plan to move DayPilot fully off Supabase: auth, Google OAuth, connected accounts, and calendar discover will run on the C# API (and your own database).

## Current vs target

| Area | Current (Supabase) | Target |
|------|--------------------|--------|
| **Auth** | Supabase Auth (email, Google sign-in) | C# API JWT (email/password + Google OAuth that issues JWT) |
| **Users** | `auth.users` + `profiles` | `users` table in your DB |
| **Connect Google** | Edge Functions `google-oauth-authorize` + `google-oauth-callback` | C# API `GET /api/google/authorize` + `GET /api/google/callback` |
| **Connected accounts / tokens** | `connected_accounts` + `google_accounts` | Same schema in your DB, served by C# API |
| **Calendar discover** | Edge Function `google-discover` or C# API | C# API only `POST /api/google/discover` |
| **Calendar/event data** | Supabase `calendars`, `events`, etc. | Your DB + C# API (later phase) |

## Google Cloud Console

After migration, **authorized redirect URIs** should point at your API, not Supabase:

- **Remove** (once Supabase is fully off):
  - `https://<project>.supabase.co/auth/v1/callback`
  - `https://<project>.supabase.co/functions/v1/google-oauth-callback`
- **Add**:
  - **API OAuth callback**: `https://daypilot-api.fly.dev/api/google/callback` (or your API base URL + `/api/google/callback`)
  - **Sign-in with Google** (if handled by API): same callback or a dedicated path, e.g. `https://daypilot-api.fly.dev/api/auth/google/callback`

Use one OAuth client for both “Connect Google” and “Sign in with Google” if you want; just list both redirect paths if they differ.

## Implementation phases

### Phase 1: API – Auth + DB + Google OAuth (this doc’s scope)

1. **Database** (SQLite for dev, Postgres optional for prod)
   - `users` (id, email, name, password_hash, created_at, etc.)
   - `connected_accounts` (id, user_id, provider, provider_account_id, email, access_token, refresh_token, token_expires_at, scope, is_active, created_at, updated_at)
2. **Auth**
   - `POST /api/auth/register` (email + password) → JWT
   - `POST /api/auth/login` (email + password) → JWT
   - `GET /api/auth/google` → redirect to Google (sign-in scopes)
   - `GET /api/auth/google/callback` → create/find user, issue JWT, redirect to frontend with token
   - Protected routes: `Authorization: Bearer <jwt>`
3. **Google Connect (Integrations)**
   - `GET /api/google/authorize?return_path=...` (requires JWT) → redirect to Google with `redirect_uri=https://daypilot-api.fly.dev/api/google/callback`
   - `GET /api/google/callback?code=...&state=...` → exchange code, parse state (user_id|return_path), store in `connected_accounts`, redirect to frontend `{FrontendUrl}{return_path}?success=connected`
4. **Me**
   - `GET /api/me` → current user (from JWT)
   - `GET /api/me/connected-accounts` → list connected accounts (from JWT)
   - `DELETE /api/me/connected-accounts/{id}` → disconnect (soft-delete or set is_active = false)
5. **Discover**
   - Keep `POST /api/google/discover` with body `{ "accessToken", "refreshToken" }` for backward compatibility
   - Add support for `POST /api/google/discover` with body `{ "connectedAccountId" }` + Bearer JWT (API looks up tokens for that user’s account)

### Phase 2: Frontend – switch to API

1. **Auth**
   - Remove Supabase auth; call `POST /api/auth/login`, `POST /api/auth/register`, and Google sign-in via `GET /api/auth/google` + callback.
   - Store JWT (e.g. memory + refresh or httpOnly cookie if API sets it).
   - Use JWT for `Authorization` on all API calls.
2. **Integrations**
   - Replace `useConnectedAccounts` / `useConnectGoogle` to use C# API:
     - Authorize: open `GET {API_URL}/api/google/authorize?return_path=/app/integrations` with Bearer JWT (or cookie).
     - List accounts: `GET /api/me/connected-accounts`.
     - Discover: `POST /api/google/discover` with `{ connectedAccountId }` + Bearer JWT.
3. **Env**
   - Remove or stop using `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - Set `VITE_API_URL=https://daypilot-api.fly.dev` (or your API base).

### Phase 3: Data (calendars, events, etc.)

- Migrate `calendars`, `events`, `calendar_mappings`, etc. to your DB and expose via C# API.
- Point frontend at new API endpoints instead of Supabase.

## API base URL and CORS

- **API base**: e.g. `https://daypilot-api.fly.dev`
- **CORS**: Allow your frontend origin(s), e.g. `https://www.daypilot.co`, `http://localhost:5174`.
- **Frontend**: Set `VITE_API_URL` so the app uses the API for auth and integrations.

## Rollback

Until Phase 2 is done and tested, keep Supabase configured so you can switch back. After Phase 2, you can remove Supabase from the repo and Google redirect URIs.
