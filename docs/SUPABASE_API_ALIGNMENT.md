# Supabase and the Nest API (DayPilot)

**Step-by-step setup:** [OPTION_C_SETUP.md](./OPTION_C_SETUP.md)

The **web app** and **Nest API** use **PostgreSQL via Prisma** (`apps/api`, `prisma/schema.prisma`).

---

## Chosen approach: Option C (hybrid mobile)

| Concern | Where it runs |
|--------|----------------|
| **Auth (mobile)** | Supabase Auth (PKCE) — users sign in/up in the Flutter app |
| **Events / calendar (mobile)** | **Nest API** — same Prisma `Event` model as the web app |
| **Realtime (Supabase)** | Still available for other tables; **not** used for `events` when `DAYPILOT_API_URL` is set (events are not mirrored to Supabase Postgres in this path) |

### API: `POST /auth/supabase-exchange`

- **Body:** `{ "accessToken": "<Supabase access JWT>" }`
- **Env (pick one or both):**
  - **`SUPABASE_URL`** — project URL (same as Flutter `SUPABASE_URL`, no trailing slash). The API verifies tokens with **JWKS** at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (ES256 / current Supabase signing keys). **Do not** use the dashboard “Key ID” UUID as a secret.
  - **`SUPABASE_JWT_SECRET`** — optional **legacy** HS256 symmetric secret if your project still uses it; omitted if you only use JWT signing keys.
- **Behavior:** Verifies the JWT, finds or creates a **Prisma `User`** by email (OAuth-style: `passwordHash` may be null), returns Nest **`accessToken`** + **`refreshToken`** like email/password login.

### Flutter

- **`DAYPILOT_API_URL`** — base URL of the Nest API (no trailing slash), e.g. `https://api.daypilot.co`
- After Supabase sign-in, the app calls **`/auth/supabase-exchange`**, stores Nest JWTs, and uses **`NestEventRepository`** for `/events` CRUD.
- If **`DAYPILOT_API_URL`** is omitted, the app keeps **Supabase-only** event storage (legacy).

### Production checklist

1. Set **`SUPABASE_URL`** (and optionally **`SUPABASE_JWT_SECRET`** if legacy HS256) on the API host (Railway, Fly, etc.).
2. Set **`CORS_ORIGIN`** (or equivalent) so the API allows your app origins if needed.
3. Flutter release builds:  
   `--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... --dart-define=DAYPILOT_API_URL=...`

---

## Other options (not selected)

### A. Supabase as the only backend

Single Postgres in Supabase; Nest would point at the same DB or be retired for mobile paths.

### B. Nest API only on mobile

Flutter uses HTTP + Nest JWT only; Supabase removed from mobile (larger refactor).

---

## Env reference

| Variable | Where | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | API | JWKS verification for Supabase access tokens (preferred with ES256 signing keys) |
| `SUPABASE_JWT_SECRET` | API | Optional legacy HS256 verification for `/auth/supabase-exchange` |
| `DAYPILOT_API_URL` | Flutter `--dart-define` | Nest API base URL (Option C) |
| `NEXT_PUBLIC_API_URL` | Web | Same API for the Next.js app |
