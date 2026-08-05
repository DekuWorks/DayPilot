# Sign in with Apple (Supabase Auth / SSO)

DayPilot web + Flutter call `signInWithOAuth({ provider: "apple" })`.
If you see `Unsupported provider: provider is not enabled`, Apple is still off
in Supabase Auth.

This is **account login**, not iCloud Calendar sync. Calendar needs CalDAV + an
app-specific password (separate work — see [CALENDAR_INTEGRATIONS_SETUP.md](./CALENDAR_INTEGRATIONS_SETUP.md)).

## Active IDs (team KR52VK4ZKR)

| Asset | Value |
|-------|--------|
| Team ID | `KR52VK4ZKR` (Marcus Brown) |
| App ID (bundle) | `com.dekuworks.daypilot` |
| Services ID | `com.dekuworks.daypilot.web` |
| SIWA Key ID | `KV5T8ZKGM2` (DayPilot Sign In with Apple) |
| Key file | `AuthKey_KV5T8ZKGM2.p8` (store outside the repo; also under `~/Downloads/`) |
| Supabase project | `wmkytyrcxbzjqiykbauw` |
| Domain | `wmkytyrcxbzjqiykbauw.supabase.co` |
| Return URL | `https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback` |

> Note: `com.daypilot.daypilot` is **not** available on this Apple team. Mobile deep
> links still use scheme `com.daypilot.daypilot` (unchanged); only the iOS/Android
> product / application IDs moved to `com.dekuworks.daypilot`.

Legacy key `Y69QWR8NLA` remains bound to Schedura (`com.schedura.app`) — do **not**
reuse it for DayPilot.

## 1. Apple Developer assets

### App ID

- Identifier: `com.dekuworks.daypilot`
- Capability: **Sign in with Apple** (enabled)

### Services ID

1. Open [Identifiers → Services IDs](https://developer.apple.com/account/resources/identifiers/list/serviceId).
2. `com.dekuworks.daypilot.web` → Enable **Sign in with Apple** → Configure:
   - Primary App ID: DayPilot (`com.dekuworks.daypilot`)
   - Domains: `wmkytyrcxbzjqiykbauw.supabase.co`
   - Return URLs: `https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback`
3. Save.

Direct edit URL:  
https://developer.apple.com/account/resources/identifiers/serviceId/edit/74M2X4CDFR

### Key (.p8)

1. Open [Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Key **DayPilot Sign In with Apple** / Key ID `KV5T8ZKGM2`, linked to primary App ID `com.dekuworks.daypilot`.
3. `.p8` is download-once — keep it outside git.

Apple client secrets are JWTs signed with that `.p8`. They expire every **6 months** — rotate with the configure script.

## 2. Enable in Supabase (pick one)

### Option A — script (recommended)

```bash
# PyJWT required (use a venv if system Python is PEP 668 managed):
python3 -m venv /tmp/apple-auth-venv
/tmp/apple-auth-venv/bin/pip install 'PyJWT[crypto]'

PATH="/tmp/apple-auth-venv/bin:$PATH" ./scripts/configure-apple-auth.sh \
  --services-id 'com.dekuworks.daypilot.web' \
  --bundle-id 'com.dekuworks.daypilot' \
  --team-id 'KR52VK4ZKR' \
  --key-id 'KV5T8ZKGM2' \
  --p8 '/secure/path/AuthKey_KV5T8ZKGM2.p8'
```

Put the **Services ID first** in Client IDs (Supabase uses the first ID for web OAuth).

After `supabase config push`, if Google Client ID is overwritten by an
`env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` placeholder, restore the real Google
client ID in the dashboard or via the Management API.

### Option B — Dashboard

1. Open [Supabase → Authentication → Providers → Apple](https://supabase.com/dashboard/project/wmkytyrcxbzjqiykbauw/auth/providers).
2. Enable Apple.
3. **Client IDs**: `com.dekuworks.daypilot.web,com.dekuworks.daypilot` (Services ID first).
4. **Secret Key**: generate a JWT (script does this) or use Supabase’s secret generator with Team ID / Key ID / `.p8`.
5. Save.

### URL configuration (same as Google)

| Setting | Value |
|---------|-------|
| Site URL | `https://www.daypilot.co` |
| Redirect URLs | `https://www.daypilot.co/**`, `https://daypilot.co/**`, `http://localhost:3000/**`, `com.daypilot.daypilot://login-callback/` |

- Web callback: `/auth/callback`
- Mobile deep link: `com.daypilot.daypilot://login-callback/` (scheme kept; bundle ID is `com.dekuworks.daypilot`)

## 3. Verify

**Web**

1. Open `https://www.daypilot.co/login` (or local `/login`).
2. Click **Continue with Apple**.
3. Complete Apple consent → land on `/dashboard`.

**iOS simulator / device**

1. Open DayPilot → **Continue with Apple**.
2. Complete consent in the system / Safari sheet.
3. App should reopen via the deep link and land on Home.

Simulator note: Sign in with Apple often needs a real Apple ID signed into the simulator Settings, or a physical device.

### Quick API check

```bash
# With Supabase CLI logged in:
TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
# strip go-keyring-base64: prefix if present, then:
curl -sS "https://api.supabase.com/v1/projects/wmkytyrcxbzjqiykbauw/config/auth" \
  -H "Authorization: Bearer $TOKEN" | jq '{external_apple_enabled, external_apple_client_id}'
```

Expect `external_apple_enabled: true` and client IDs starting with `com.dekuworks.daypilot.web`.

## Auth vs Calendar

| Feature | Where credentials live | Doc |
|---------|------------------------|-----|
| **Sign in with Apple** | Supabase Auth → Apple provider | this file |
| **iCloud Calendar sync** | Nest CalDAV + app-specific password | [CALENDAR_INTEGRATIONS_SETUP.md](./CALENDAR_INTEGRATIONS_SETUP.md) |

Signing in with Apple does **not** grant calendar access (Apple limitation). Sync → **Sign in with Apple** can link SSO and prefill the Apple ID email; iCloud Calendar still needs CalDAV + an [app-specific password](https://support.apple.com/en-us/102654).

## References

- Supabase: https://supabase.com/docs/guides/auth/social-login/auth-apple
- Apple: https://developer.apple.com/sign-in-with-apple/
