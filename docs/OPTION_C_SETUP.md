# Option C setup walkthrough (Supabase auth + Nest API for mobile)

Follow these steps in order. You need: a **Supabase** project, **Postgres** for the API (local or hosted), and the **Nest API** running with the new env vars.

---

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (pick region, set a DB password).
2. When it’s ready, open **Project Settings** (gear) → **API**:
   - Copy **Project URL** → this is `SUPABASE_URL`.
   - Copy **anon public** key → `SUPABASE_ANON_KEY`.
   - Copy **JWT Secret** (under *JWT Settings*) → you will use this as `SUPABASE_JWT_SECRET` on the **API** (not in the Flutter app).
3. **Authentication** → **URL configuration**: add your redirect URLs if you use deep links later. For email/password from the simulator, defaults usually work.

---

## 2. API (Nest) — database

The API stores users and events in **Postgres** (Prisma), not in Supabase’s DB unless you point `DATABASE_URL` there.

**Local (simplest for dev):**

```bash
# From repo root
docker compose up -d
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET (32+ chars), etc.
pnpm install
pnpm db:migrate
pnpm dev --filter @daypilot/api
```

Default API URL is usually **`http://localhost:3001`** (check your `PORT` in `.env`).

**Add these to your API `.env`:**

```env
# Required for Option C exchange endpoint
SUPABASE_JWT_SECRET=paste_the_jwt_secret_from_supabase_dashboard

# CORS: comma-separated origins allowed to call the API (browser/simulator)
# Include your Next dev origin and any mobile debug origins if needed
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

Restart the API after saving.

---

## 3. API — verify exchange (optional)

With the API running:

```bash
# Get a Supabase access token: sign in via Flutter or Supabase dashboard Auth,
# or use Supabase client in a one-off script. Then:
curl -s -X POST http://localhost:3001/auth/supabase-exchange \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"YOUR_SUPABASE_ACCESS_JWT"}' | jq .
```

You should see `accessToken`, `refreshToken`, and `user` (Nest shape). If you get `SUPABASE_JWT_SECRET is not configured`, fix step 2.

---

## 4. Flutter — run with Option C

Flutter does **not** read a `.env` file by itself. Pass values at **build/run** time.

**One-off run (replace placeholders):**

```bash
cd daypilot_flutter

flutter run \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --dart-define=DAYPILOT_API_URL=http://localhost:3001
```

**Android emulator:** `localhost` on your machine is **`10.0.2.2`** from the emulator:

```bash
--dart-define=DAYPILOT_API_URL=http://10.0.2.2:3001
```

**iOS simulator:** `http://localhost:3001` usually works.

**Physical device:** use your computer’s LAN IP, e.g. `http://192.168.1.10:3001`, and ensure the phone and PC are on the same Wi‑Fi and the firewall allows port 3001.

---

## 5. VS Code / Cursor launch (optional)

Create **`.vscode/launch.json`** in the repo (or use your user launch config) with a configuration whose `args` include the three `--dart-define` lines above. **Do not commit real secrets** to git; use a local-only file or environment substitution.

---

## 6. Production (Railway / Fly / etc.)

1. Deploy the **API** with the same env as local, especially:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SUPABASE_JWT_SECRET`
   - `CORS_ORIGIN` (your web + any origins that need the API)
2. Set **`DAYPILOT_API_URL`** in Flutter to your **public API URL** (HTTPS, no trailing slash), e.g. `https://api.yourdomain.com`.
3. Rebuild the Flutter app with all `--dart-define` values for release.

---

## Quick checklist

| Step | Done |
|------|------|
| Supabase project URL + anon key + JWT secret copied | ☐ |
| `SUPABASE_JWT_SECRET` set on API `.env` | ☐ |
| Postgres running + `pnpm db:migrate` | ☐ |
| API running on known host:port | ☐ |
| Flutter `flutter run` with 3 dart-defines (including `DAYPILOT_API_URL`) | ☐ |
| Sign in on mobile → calendar loads events from Nest | ☐ |

If something fails, check API logs for `/auth/supabase-exchange` and confirm `SUPABASE_JWT_SECRET` matches the Supabase dashboard **exactly**.
