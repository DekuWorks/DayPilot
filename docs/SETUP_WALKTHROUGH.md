# DayPilot setup walkthrough (step-by-step)

Follow these steps in order to plug in and configure everything: **required** first, then **optional** (Stripe, Google Calendar, AI, Sentry), then **production**.

---

## Part 1: Required (auth + database)

### Step 1.1 — Start PostgreSQL

**Option A: Docker (recommended for local)**

If you don’t already have a container named `daypilot-db`:

```bash
docker run -d --name daypilot-db -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=daypilot \
  postgres:16
```

**If you see "container name already in use":** the container already exists. Start it if it’s stopped: `docker start daypilot-db`. Check status: `docker ps` (you should see `daypilot-db` and port 5432). Then continue to Step 1.2.

**Option B: Docker Compose (if you use the repo’s `docker-compose.yml`)**

From repo root:

```bash
docker compose up -d
```

(Ensure the compose file defines a Postgres service with port 5432 and env above.)

**Option C: Local Postgres**

Install Postgres 16, create a database named `daypilot`, and note the connection string.

---

### Step 1.2 — Create API env file

From the **repo root**:

1. Copy the example env:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set these **required** values (edit the existing lines or uncomment):

   | Variable | Example value | Notes |
   |----------|----------------|--------|
   | `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/daypilot` | Match your Postgres user/password/db. |
   | `JWT_SECRET` | `your-super-secret-key-at-least-32-characters-long` | Min 32 characters; use a random string in production. |
   | `PORT` | `3001` | API port (use 3001 if web runs on 3000). |
   | `CORS_ORIGIN` | `http://localhost:3000` | Frontend origin (Next.js dev is usually 3000). |

3. Save the file. Do **not** commit `.env` (it’s in `.gitignore`).

---

### Step 1.3 — Run database migrations

From the **repo root**:

```bash
pnpm install
pnpm db:migrate:deploy
```

This applies all Prisma migrations to the database. If you see “No pending migrations,” the DB is already up to date.

---

### Step 1.4 — Start the API

From the **repo root**:

```bash
pnpm run build --filter @daypilot/api
pnpm start --filter @daypilot/api
```

Or for **development** (watch mode):

```bash
pnpm run dev --filter @daypilot/api
```

You should see: `DayPilot API listening on port 3001` (or your `PORT`). Leave this terminal open.

**Quick check:** Open `http://localhost:3001/health` in a browser. You should see something like `{"status":"ok","db":"ok"}`.

---

### Step 1.5 — Create Web env file

1. Open `apps/web/`.
2. Create `.env.local` (or copy from `.env.example`):
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```
3. Set the API URL:
   - `NEXT_PUBLIC_API_URL=http://localhost:3001`
4. Save. Do not commit `.env.local`.

---

### Step 1.6 — Start the Web app

In a **new terminal**, from the **repo root**:

```bash
pnpm run dev --filter @daypilot/web
```

Or from `apps/web`:

```bash
cd apps/web && pnpm dev
```

Open **http://localhost:3000** in your browser.

---

### Step 1.7 — Verify auth and app

1. Click **Get Started** (or go to `/signup`).
2. Sign up with email and password.
3. You should land on the dashboard (or calendar).
4. Open **Calendar** — you can create/edit/delete events.
5. Open **Settings** — profile page should load.

**Result:** Auth, dashboard, calendar, and events work. No payments, Google, or AI yet.

---

## Part 2: Optional — Stripe (payments)

### Step 2.1 — Create a Stripe account and get keys

1. Go to [stripe.com](https://stripe.com) and sign up (or log in).
2. Open **Developers → API keys**.
3. Copy the **Secret key** (starts with `sk_test_` for test mode).
4. Keep the Stripe Dashboard open for the next steps.

---

### Step 2.2 — Create a product and price (test mode)

1. In Stripe: **Product catalog → Add product**.
2. Name it (e.g. “Personal”) and add a **price** (e.g. $10/month recurring).
3. After saving, open the **price** and copy the **Price ID** (e.g. `price_1ABC...`).

Repeat if you want multiple tiers (Personal, Business, Enterprise). You need at least one Price ID.

---

### Step 2.3 — Add Stripe env to the API

In your **root `.env`** (or `apps/api/.env`), add:

```env
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=<paste from Stripe Dashboard>
STRIPE_WEBHOOK_SECRET=<paste from Stripe CLI or Webhooks>
STRIPE_PRICE_PERSONAL=<paste Price ID from Stripe>
```

- Use your **Secret key** for `STRIPE_SECRET_KEY`.
- Leave `STRIPE_WEBHOOK_SECRET` empty for now; you’ll set it in Step 2.5.
- Use the Price ID(s) you copied. If you only have one price, set `STRIPE_PRICE_PERSONAL`; the app can use that for “Upgrade.”

---

### Step 2.4 — Expose your API for the webhook (local: Stripe CLI)

Stripe needs to send webhooks to your API. Locally, your API is not public, so use the **Stripe CLI** to forward events:

1. Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`
3. In a **new terminal**, with the API running on 3001:
   ```bash
   stripe listen --forward-to localhost:3001/billing/webhook
   ```
4. The CLI will print a **webhook signing secret** (e.g. `whsec_...`). Copy it into `.env` as `STRIPE_WEBHOOK_SECRET`.
5. Restart the API so it picks up the new secret.

---

### Step 2.5 — (Production) Webhook in Stripe Dashboard

When you deploy the API to a **public URL** (e.g. `https://api.daypilot.co`):

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://your-api-url/billing/webhook`.
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Add endpoint. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` in your API’s production env.

---

### Step 2.6 — Optional: “Upgrade” button on the Web app

In `apps/web/.env.local` add (use one Price ID, e.g. Personal):

```env
NEXT_PUBLIC_STRIPE_PRICE_ID=price_YOUR_PRICE_ID
```

Redeploy or restart the web app. The Billing page will show an “Upgrade” button that starts Stripe Checkout.

---

### Step 2.7 — Test payments (test mode)

1. Go to **Billing** in the app and click **Upgrade** (if you set `NEXT_PUBLIC_STRIPE_PRICE_ID`).
2. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. After payment, you should return to the app and subscription status should update (webhook must be running via Stripe CLI locally, or deployed endpoint in prod).

**Result:** Checkout, subscription sync, and (if configured) billing portal work.

The Billing page also loads `GET /billing/plans` from the API (prices from `STRIPE_PRICE_*`). If that catalog is empty, it falls back to `NEXT_PUBLIC_STRIPE_PRICE_ID`. When the billing API is offline, the UI shows the Free plan with a soft notice (not a hard error).

Webhook events handled: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

---

## Part 2b: Optional — App Store subscriptions (Flutter / iOS)

Tiers align with web: **Free**, **Personal**, **Business**, **Enterprise**.

**Repo status:** Flutter IAP (`in_app_purchase`), `daypilot_flutter/ios/Runner/DayPilot.storekit`, and Nest `POST /billing/apple/confirm` are already wired. You still need App Store Connect products + a reachable API for entitlement sync.

### Step 2b.1 — Create subscriptions in App Store Connect

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your DayPilot iOS app (create the app record if it does not exist yet — use your real Apple Developer account; this doc does not invent credentials).
2. **Subscriptions** → create a subscription group (e.g. “DayPilot Plans”).
3. Add auto-renewable products with these **Product IDs** (must match Flutter + Nest defaults):

   | Product ID | Tier | StoreKit display price (local) |
   |------------|------|--------------------------------|
   | `co.daypilot.personal.monthly` | Personal | $9.99 / month |
   | `co.daypilot.business.monthly` | Business | $29.99 / month |
   | `co.daypilot.enterprise.monthly` | Enterprise | $99.99 / month |

4. Set pricing, localization, and review information for each.
5. If you use different Product IDs, set matching env on the API:
   `APPLE_PRODUCT_PERSONAL`, `APPLE_PRODUCT_BUSINESS`, `APPLE_PRODUCT_ENTERPRISE`.

### Step 2b.2 — Local StoreKit testing (Xcode) — fastest path

No App Store Connect products or sandbox Apple ID required for this path.

1. Open `daypilot_flutter/ios/Runner.xcworkspace` in Xcode.
2. **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration** → select  
   `Runner/DayPilot.storekit` (repo path: `daypilot_flutter/ios/Runner/DayPilot.storekit`).
3. Run on a simulator or device. Purchases use the local StoreKit config.
4. API must be reachable from the device/simulator:
   - Local: `DAYPILOT_API_URL` / Flutter env pointing at `http://127.0.0.1:3001` (or your LAN IP).
   - Set `APPLE_IAP_SKIP_VERIFY=1` on the API (or run with `NODE_ENV` ≠ `production`) so `POST /billing/apple/confirm` accepts local transactions.
5. In the app: **Profile → Billing** → purchase a plan → confirm tier updates after Nest confirm.

### Step 2b.3 — Flutter / API wiring (already in repo)

- Product IDs: `lib/features/billing/iap_products.dart` (keep in sync with StoreKit + App Store Connect).
- Purchase flow: `iap_billing_service.dart` → StoreKit → `POST /billing/apple/confirm` with `{ productId, transactionId }` (Nest JWT via Supabase exchange).
- Nest mapping: `BillingService.confirmApplePurchase` → subscription tier in Prisma.
- Production verification: set `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY` (App Store Server API key from App Store Connect → Users and Access → Integrations → In-App Purchase) and **unset** `APPLE_IAP_SKIP_VERIFY`. Full JWS verification can be tightened further in `BillingService.confirmApplePurchase`.

### Step 2b.4 — Sandbox / TestFlight

1. Create a **Sandbox** Apple ID in App Store Connect → Users and Access → Sandbox (do not use your real Apple ID).
2. On a device: Settings → App Store → Sandbox Account (or sign out of Media & Purchases on older iOS).
3. Ensure App Store Connect products are in a state that allows sandbox purchases ( Cleared for Sale / ready for submit as applicable).
4. Build a TestFlight or development build **without** the StoreKit Configuration file selected (so the app talks to Sandbox, not the local `.storekit` file).
5. Exercise Purchase / Restore on the Billing screen; confirm Nest updates the subscription when the API is online.

**Result:** iOS users can buy Personal/Business/Enterprise; entitlements sync to the same subscription model as Stripe web users.

### Stripe Dashboard checklist (web) — when keys are ready

Local/repo code already handles checkout, portal, plans, and Free fallback. Paste these into API env (never commit):

| Env var | Where to get it |
|---------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint signing secret (`whsec_…`) |
| `STRIPE_PRICE_PERSONAL` | Product catalog → Price ID (`price_…`) |
| `STRIPE_PRICE_BUSINESS` | optional |
| `STRIPE_PRICE_ENTERPRISE` | optional |
| `FRONTEND_URL` | `https://www.daypilot.co` in prod |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | optional single-plan fallback in `apps/web` / Pages vars |

Production webhook endpoint (after API is public): `https://api.daypilot.co/billing/webhook`  
Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.  
Local: `stripe listen --forward-to localhost:3001/billing/webhook`.

---

## Part 3: Optional — Google Calendar (Integrations)

### Step 3.1 — Create a Google Cloud project and OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (or select one) and name it (e.g. “DayPilot”).
3. Open **APIs & Services → Credentials**.
4. **Create credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Name it (e.g. “DayPilot Web”).
7. **Authorized redirect URIs** — add (replace with your API base URL):
   - Local: `http://localhost:3001/calendar-connections/google/callback`
   - Production: `https://your-api-domain/calendar-connections/google/callback`
8. Create. Copy the **Client ID** and **Client secret**.

---

### Step 3.2 — Enable Google Calendar API

1. In Google Cloud Console: **APIs & Services → Library**.
2. Search for **Google Calendar API** and open it.
3. Click **Enable**.

---

### Step 3.3 — Add Google env to the API

In your **root `.env`** (or `apps/api/.env`), add:

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

Ensure `FRONTEND_URL` is set (e.g. `http://localhost:3000`); the API uses it for redirects after OAuth.

Restart the API.

---

### Step 3.4 — Test Connect Google

1. In the app, go to **Integrations**.
2. Click **Connect Google**.
3. Sign in with Google and allow calendar access.
4. You should return to Integrations and see the connected account; you can **Discover** calendars.

**Result:** Google Calendar connect, disconnect, and discover work.

---

## Part 4: Optional — AI (schedule suggestions)

### Step 4.1 — Choose a provider

- **OpenAI** — simplest; you need an API key from [platform.openai.com](https://platform.openai.com).
- **Anthropic (Claude)** — [console.anthropic.com](https://console.anthropic.com); get an API key.
- **OpenAI-compatible** (Together, Groq, OpenRouter, etc.) — use their base URL and API key.

---

### Step 4.2 — Add AI env to the API

**Option A: OpenAI**

In `.env`:

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
# Optional: OPENAI_MODEL=gpt-4o-mini
```

**Option B: Anthropic**

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
# Optional: ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

**Option C: OpenAI-compatible (e.g. Together, Groq)**

```env
AI_PROVIDER=openai-compatible
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.together.xyz/v1
# Optional: OPENAI_MODEL=...
```

Restart the API. Any UI that calls `POST /ai/suggest-schedule` (or the frontend AI helper) will work.

**Result:** AI scheduling suggestions work.

---

## Part 5: Optional — Sentry (error tracking)

### Step 5.1 — Create a Sentry project

1. Go to [sentry.io](https://sentry.io) and sign up or log in.
2. Create a new project (e.g. “DayPilot API” for Node/NestJS and “DayPilot Web” for Next.js).
3. Copy the **DSN** (Client Keys) for each project.

---

### Step 5.2 — Add Sentry to the API

In `.env`:

```env
SENTRY_DSN=https://YOUR_DSN@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
```

Restart the API. 5xx errors will be sent to Sentry.

---

### Step 5.3 — Add Sentry to the Web app

In `apps/web/.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
```

Rebuild/restart the web app. Frontend errors will be sent to Sentry.

**Result:** API and frontend errors show up in Sentry.

---

## Part 6: Production deployment (high level)

### Step 6.1 — Database

- Provision Postgres (Fly Postgres, Neon, Supabase, Railway, etc.).
- Set `DATABASE_URL` in your API host’s environment.
- Run migrations **once per release**: `pnpm db:migrate:deploy` (e.g. in CI or release script).

### Step 6.2 — API host (Fly.io, Railway, Render, etc.)

- Connect the repo; build: `pnpm install && pnpm run build --filter @daypilot/api`.
- Start: `node apps/api/dist/main.js` (or `pnpm start --filter @daypilot/api`).
- Set env: `DATABASE_URL`, `JWT_SECRET` (strong, 32+ chars), `NODE_ENV=production`, `PORT`, `CORS_ORIGIN` (your frontend URL, e.g. `https://daypilot.co`), `FRONTEND_URL`, and any optional (Stripe, Google, AI, Sentry).
- For Stripe webhooks: set `STRIPE_WEBHOOK_SECRET` to the **production** webhook signing secret (endpoint URL: `https://your-api/billing/webhook`).

### Step 6.3 — Web host (e.g. Vercel)

- Connect the repo; root directory `apps/web` (or repo root with build command targeting web).
- Build: `pnpm install && pnpm run build --filter @daypilot/web` (or equivalent).
- Set env: `NEXT_PUBLIC_API_URL=https://your-api-url`, and optionally `NEXT_PUBLIC_STRIPE_PRICE_ID`, `NEXT_PUBLIC_SENTRY_DSN`.

### Step 6.4 — CORS and Google OAuth

- Set `CORS_ORIGIN` to your production frontend origin(s), comma-separated (e.g. `https://daypilot.co,https://www.daypilot.co`).
- In Google Cloud Console, add the **production** redirect URI: `https://your-api-domain/calendar-connections/google/callback`.

### Step 6.5 — Stripe production

- Switch Stripe to **live** mode when ready.
- Use **live** API keys and create a **live** webhook endpoint; set `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` to live values in production.

---

## Checklist summary

| Step | What | Required? |
|------|------|-----------|
| 1.1–1.7 | Postgres, API env, migrations, start API, Web env, start Web, verify auth | ✅ Yes |
| 2.1–2.7 | Stripe keys, webhook, price IDs, test checkout | Optional |
| 3.1–3.4 | Google OAuth client, Calendar API, env, test Connect Google | Optional |
| 4.1–4.2 | OpenAI or Anthropic (or compatible) key, env | Optional |
| 5.1–5.3 | Sentry project, DSN for API and Web | Optional |
| 6.1–6.5 | Deploy DB, API, Web; CORS; Google/Stripe production | When going live |

For more detail on deployment and env, see `docs/DEPLOYMENT.md` and `docs/WHAT_WORKS_AND_WHAT_TO_PLUG_IN.md`.
