# What’s working and what to plug in

Overview of what’s **implemented and working** vs what **you must configure** (env, secrets, deploy) for DayPilot.

---

## 1. What’s working (code is in place)

### Backend (NestJS API — `apps/api`)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | Signup, login, logout, refresh token, JWT, `GET /auth/me`. |
| **Billing** | ✅ | Stripe: get subscription, create checkout session, billing portal, webhook (checkout/subscription events). |
| **Events** | ✅ | CRUD events (create, list, update, delete), JWT-protected. |
| **AI** | ✅ | `POST /ai/suggest-schedule` (OpenAI or Anthropic or OpenAI-compatible). |
| **Calendar connections** | ✅ | Google OAuth: connect, disconnect, list calendars, discover. Outlook/Microsoft wired in code. |
| **Real-time** | ✅ | WebSocket gateway (events/team presence). |
| **Health** | ✅ | `GET /health` (DB check), `GET /metrics` (uptime, request count). |
| **Observability** | ✅ | Request logging, Sentry (optional), audit logs (auth, billing, events). |
| **Production** | ✅ | Rate limiting, CORS (comma-separated origins), validation, env schema (JWT_SECRET in prod). |

### Frontend (Next.js — `apps/web`)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | Login, signup, logout; token in localStorage; refresh; `AuthProvider` + `RequireAuth`. |
| **App shell** | ✅ | Dashboard, Calendar, Integrations, Billing, Settings; protected routes. |
| **Billing UI** | ✅ | Subscription status, “Upgrade” (Stripe Checkout), “Manage billing” (Stripe Portal). |
| **Integrations** | ✅ | Connect Google, disconnect, discover calendars (uses API when `NEXT_PUBLIC_API_URL` set). |
| **Calendar** | ✅ | Calendar view; events from API. |
| **Pricing / Features** | ✅ | Marketing pages. |
| **Error handling** | ✅ | Global error boundary; optional Sentry. |

### Database (Prisma + PostgreSQL)

| Area | Status | Notes |
|------|--------|--------|
| **Schema** | ✅ | Users, RefreshToken, Subscription, Event, Task, Organization, Team, CalendarConnection, AuditLog. |
| **Migrations** | ✅ | `prisma/migrations`; run `pnpm db:migrate` (dev) or `pnpm db:migrate:deploy` (prod). |

So: **auth, billing, events, AI, calendar connections, real-time, health, metrics, audit, and production hardening are all implemented.** They work once the right env and external services are set.

---

## 2. What you need to do and plug in

### A. Local dev (minimal: auth + DB)

1. **Database**
   - Postgres running (e.g. Docker: `docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=daypilot postgres:16`).
   - Copy root `.env.example` → `.env` (or `apps/api/.env`).
   - Set `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `PORT=3001`, `CORS_ORIGIN=http://localhost:3000`.
   - Run migrations: `pnpm db:migrate:deploy` (or `pnpm db:migrate` for dev).

2. **API**
   - From repo root: `pnpm install`, then `pnpm run build --filter @daypilot/api` and `pnpm start --filter @daypilot/api` (or `cd apps/api && pnpm dev`).
   - API runs on port 3001 (or whatever `PORT` is).

3. **Web**
   - In `apps/web`: set `NEXT_PUBLIC_API_URL=http://localhost:3001` (e.g. in `apps/web/.env.local` or `.env`).
   - Run: `pnpm run build --filter @daypilot/web` and `pnpm start --filter @daypilot/web` (or `cd apps/web && pnpm dev`).
   - Open app, sign up, log in — auth and app shell work.

**Result:** Login, signup, dashboard, calendar, events (CRUD) work. No payments, no Google/OAuth, no AI until you add the optional env below.

---

### B. Optional: payments (Stripe)

**API (`apps/api` or root `.env`):**

- `STRIPE_SECRET_KEY` — Stripe secret key (e.g. `sk_test_...`).
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret (`whsec_...`) so subscription updates work.
- `FRONTEND_URL` — Frontend base URL (e.g. `http://localhost:3000` or `https://daypilot.co`) for Stripe redirects.
- `STRIPE_PRICE_PERSONAL`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ENTERPRISE` — Price IDs if you use tiered checkout.

**Webhook:**

- In Stripe Dashboard: add endpoint `https://<your-api>/billing/webhook`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Important:** Your API must send the **raw body** to the webhook (already done in `main.ts` with `rawBody`).

**Web (`apps/web`):**

- `NEXT_PUBLIC_STRIPE_PRICE_ID` — One Stripe Price ID to show “Upgrade” and redirect to Checkout (optional; omit to hide button).

**Result:** Upgrade button, Checkout, Portal, and subscription sync after payment all work.

---

### C. Optional: Google Calendar (Integrations)

**API:**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — From Google Cloud Console (OAuth 2.0 credentials).
- `FRONTEND_URL` — Used for OAuth redirect back to frontend.
- API base URL for OAuth callbacks: ensure your API is reachable at the URL you use (e.g. `https://api.daypilot.co`). Callbacks are like `https://<api>/calendar-connections/google/callback`.

**Google Cloud Console:**

- Add authorized redirect URIs: `https://<your-api>/calendar-connections/google/callback` and (if used) auth callback for login.
- Enable Google Calendar API (or the APIs your backend uses).

**Result:** “Connect Google” on Integrations page works; calendar list and discover work.

---

### D. Optional: AI (schedule suggestions)

**API (one of):**

- **OpenAI:** `OPENAI_API_KEY`, optionally `OPENAI_MODEL` (default `gpt-4o-mini`).
- **OpenAI-compatible (Together, Groq, OpenRouter, etc.):** `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_PROVIDER=openai-compatible`, optionally `OPENAI_MODEL`.
- **Anthropic:** `ANTHROPIC_API_KEY`, `AI_PROVIDER=anthropic`, optionally `ANTHROPIC_MODEL`.

**Result:** `POST /ai/suggest-schedule` and any frontend that calls it work.

---

### E. Optional: observability

- **API:** `SENTRY_DSN` — API errors (5xx) sent to Sentry.
- **Web:** `NEXT_PUBLIC_SENTRY_DSN` — Frontend errors to Sentry.
- **Source maps (CI):** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for web build.

---

### F. Production deployment

1. **Database:** Provision Postgres (e.g. Fly Postgres, Neon, Supabase DB, Railway). Set `DATABASE_URL` on the API host.
2. **API:** Deploy to Fly.io / Railway / Render / AWS. Set all required env (see table below). Run `pnpm db:migrate:deploy` before or during release. Set `NODE_ENV=production` and a strong `JWT_SECRET`.
3. **Web:** Deploy to Vercel (or similar). Set `NEXT_PUBLIC_API_URL` to your API URL (e.g. `https://api.daypilot.co`).
4. **CORS:** Set `CORS_ORIGIN` to your frontend origin(s), comma-separated (e.g. `https://daypilot.co,https://www.daypilot.co`).
5. **Stripe:** Use live keys and live webhook URL in production; set `FRONTEND_URL` to production frontend URL.
6. **Google (if used):** Add production redirect URI in Google Console.

---

## 3. Env checklist (quick reference)

| Variable | Where | Required? | Purpose |
|----------|--------|-----------|---------|
| `DATABASE_URL` | API | ✅ Yes | Postgres connection string. |
| `JWT_SECRET` | API | ✅ Yes (prod: strong, not default) | Sign/verify JWTs. |
| `PORT` | API | No (default 3001) | API server port. |
| `CORS_ORIGIN` | API | ✅ Recommended in prod | Allowed frontend origin(s), comma-separated. |
| `NEXT_PUBLIC_API_URL` | Web | ✅ Yes | API base URL (no trailing slash). |
| `FRONTEND_URL` | API | For Stripe/OAuth | Frontend base URL for redirects. |
| `STRIPE_SECRET_KEY` | API | For billing | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | API | For subscription sync | Webhook signing secret. |
| `STRIPE_PRICE_*` | API | For tiered checkout | Personal/Business/Enterprise price IDs. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Web | Optional | Single price for “Upgrade” button. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | API | For Google Calendar | OAuth credentials. |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | API | For AI | AI provider keys; optional. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | API / Web | Optional | Error tracking. |

---

## 4. Summary

- **Working now (once env is set):** Auth, database, events, app shell, billing (Stripe), calendar connections (Google), AI, real-time, health, metrics, audit, rate limiting, CORS, validation.
- **You plug in:** (1) Database + `DATABASE_URL` + migrations, (2) `JWT_SECRET` and `NEXT_PUBLIC_API_URL`, (3) optional: Stripe keys + webhook, Google OAuth, OpenAI/Anthropic, Sentry, (4) production: deploy API + Web, set CORS and frontend URL, run migrations.

For step-by-step deployment, see `docs/DEPLOYMENT.md`. For env details, see root `.env.example` and `apps/web/.env.example`.
