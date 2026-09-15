# App Store Review notes — DayPilot Daily (iOS)

**Last updated:** 2026-09-15  
**Addresses:** Resolution Center rejection for Version 1.0 (build 8), 19 Aug 2026.

## Guideline 4 — Design (sign-in in browser)

**Cause:** Flutter called `signInWithOAuth` with `LaunchMode.externalApplication`, which opened Safari for Apple/Google SSO.

**Fix (build 14+):**

| Provider | In-app path |
|----------|-------------|
| Apple (iOS/macOS) | Native **Sign in with Apple** → `signInWithIdToken` |
| Google / Microsoft | Supabase OAuth URL opened with **`flutter_web_auth_2`** (`ASWebAuthenticationSession` / Custom Tabs) |
| Web | Unchanged browser OAuth (not App Store) |

SwiftUI already used `ASWebAuthenticationSession` for Google.

**Reviewer tip:** On the login screen, tap **Continue with Apple** or **Continue with Google**. The credential UI stays inside the app (system sheet / in-app auth session). The user is not sent to Safari as the primary path.

## Guideline 5.1.1(v) — Account deletion

**Entry points**

| Client | Path |
|--------|------|
| Flutter iOS | Profile → **Settings** → **Delete account** (confirmation dialog) |
| Web | Signed-in → **Settings** → **Delete account** (`/settings`) |
| SwiftUI | Settings tab → **Delete account** |

**API:** `DELETE /auth/me` with JSON body `{ "confirm": "DELETE" }` (Nest JWT). Deletes Nest user rows, then the Supabase Auth user via Admin API (`SUPABASE_SERVICE_ROLE_KEY` on the API host).

**Privacy policy:** [daypilot.co/privacy](https://www.daypilot.co/privacy) documents in-app deletion under “Your choices”.

### Screen recording script for App Review

1. Launch DayPilot Daily on a physical device.
2. Create an account or sign in (Apple or Google).
3. Open **Profile** → **Settings**.
4. Tap **Delete account** → confirm **Delete**.
5. Confirm the app returns to the signed-out / login screen and the same credentials can no longer open the previous account.

Paste the recording in Resolution Center with a short note pointing at **Settings → Delete account**.

## Ops checklist before resubmit

1. Set `SUPABASE_SERVICE_ROLE_KEY` (and `SUPABASE_URL`) on the Nest API host — required for deletion of SSO accounts.
2. Apply Supabase migration `20260915210000_profiles_auth_user_cascade.sql` so profile rows cascade when auth users are removed.
3. Bump iOS build past 8 (repo Flutter version is `1.0.0+14`).
4. Keep Nest JWT / cookie / CORS behaviour from recent auth PRs unchanged aside from the new `DELETE /auth/me` route.
