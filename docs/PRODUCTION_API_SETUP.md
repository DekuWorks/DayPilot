# Create a Production API URL

You need to deploy the DayPilot API to a host that provides a public URL. Here are two options.

---

## Current production status (2026-08-15)

| Check | Result |
|-------|--------|
| Active API host | **Railway** — `https://api-production-6c2c.up.railway.app` (project `daypilot-api`) |
| Railway custom domain | `api.daypilot.co` registered (CNAME target `66xfwrf9.up.railway.app`). Nest uses it for OAuth once `/health` answers; Railway URL is the fallback. |
| `https://api.daypilot.co` DNS | **NXDOMAIN at GoDaddy** until the CNAME below is added. |

### GoDaddy DNS for `api.daypilot.co` (Marcus must click)

At [GoDaddy DNS](https://dcc.godaddy.com/) for `daypilot.co` (`ns01/ns02.domaincontrol.com`):

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `66xfwrf9.up.railway.app` |
| TXT | `_railway-verify.api` | `railway-verify=481b069546054133d88169eda43e0efae0b6d02e781f0565418cbce2443c1bfe` |

Then verify: `curl -sS https://api.daypilot.co/health` → `{"status":"ok",...}`.
| Fly app `daypilot-api` | Suspended / unused (`FLY_API_TOKEN` not set in GitHub; trial previously ended) |
| GH Actions `deploy-api.yml` | Builds + pushes `ghcr.io/<owner>/daypilot-api:latest`; Fly deploy skipped without `FLY_API_TOKEN` |
| GitHub Actions var `NEXT_PUBLIC_API_URL` | Set to Railway URL until `api.daypilot.co` resolves |

### Unblock checklist (Fly — preferred if you keep this host)

1. Add a payment method: [https://fly.io/trial](https://fly.io/trial) (or Billing in the Fly dashboard).
2. Unsuspend / redeploy:
   ```bash
   fly auth login
   cd apps/api
   fly deploy -a daypilot-api
   ```
3. Confirm secrets on the app (`fly secrets list -a daypilot-api`), at minimum:
   - `DATABASE_URL` (Postgres — Fly Postgres or Supabase pooler)
   - `JWT_SECRET` (≥32 chars)
   - `CORS_ORIGIN=https://www.daypilot.co,https://daypilot.co`
   - `FRONTEND_URL=https://www.daypilot.co`
   - `API_URL=https://api.daypilot.co` (or `https://daypilot-api.fly.dev` until DNS is ready)
   - Optional billing: `STRIPE_*`, `APPLE_*`
4. DNS at GoDaddy for `daypilot.co`:
   - **A** record: host `api` → `66.241.124.30` (Fly shared IPv4; re-check with `fly ips list -a daypilot-api` after unsuspend)
   - Or **CNAME** `api` → `daypilot-api.fly.dev` if Fly documents CNAME for your plan
5. GitHub → Settings → Secrets and variables → Actions → **Variables**:
   - `NEXT_PUBLIC_API_URL=https://api.daypilot.co`
6. Push to `main` (or re-run **Deploy to GitHub Pages**) so the web build picks up the API URL.
7. Verify: `curl -sS https://api.daypilot.co/health` → healthy JSON.

Until the API is reachable, the web app already defers Nest exchange and billing falls back to Free with a soft notice.

---

## Option A: Railway (fastest alternative)

1. **Sign up** at [railway.app](https://railway.app).

2. **Create a project** → **Deploy from GitHub** → select `DekuWorks/DayPilot`.

3. **Add Postgres**  
   - In the project: **New** → **Database** → **PostgreSQL**  
   - Railway creates a `DATABASE_URL` for you.  
   - Or point `DATABASE_URL` at Supabase Postgres if you prefer one DB.

4. **Add the API service**  
   - **New** → **GitHub Repo** → select DayPilot  
   - Or **New** → **Docker Image** → `ghcr.io/dekuworks/daypilot-api:latest` (uses the image built by CI)

5. **Configure the service**
   - **Root Directory:** leave blank (or use `apps/api` if deploying from source)
   - **Build Command:** `cd ../.. && pnpm install && pnpm run build --filter @daypilot/api` (if from source)
   - **Start Command:** `cd ../.. && npx prisma migrate deploy && node apps/api/dist/main.js` (if from source)  
   - Or for Docker: no build/start commands; image includes migrate + start.

6. **Set environment variables**

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | From Railway Postgres (usually auto-linked) |
   | `JWT_SECRET` | A long random string (min 32 chars) |
   | `CORS_ORIGIN` | `https://www.daypilot.co,https://daypilot.co` |
   | `FRONTEND_URL` | `https://www.daypilot.co` |
   | `API_URL` | `https://<your-app>.up.railway.app` (or `https://api.daypilot.co` after DNS) |
   | `PORT` | `3001` |

7. **Deploy** — Railway gives a URL like `https://daypilot-api-production.up.railway.app`.

8. **DNS** — CNAME `api` → your Railway hostname (or use Railway’s custom domain UI).

9. **Add `NEXT_PUBLIC_API_URL` to GitHub Actions**  
   - Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**  
   - Add `NEXT_PUBLIC_API_URL` = `https://api.daypilot.co` (or the Railway URL temporarily)

---

## Option B: Fly.io

1. **Install flyctl**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Log in**
   ```bash
   fly auth login
   ```

3. **Billing** — Fly requires a card after the trial. Without it, apps stay suspended and `fly deploy` fails with `trial has ended`.

4. **Postgres**
   ```bash
   fly postgres create
   ```
   Note the `DATABASE_URL` (or attach it later). Existing app name in this repo’s history: `daypilot-db`.

5. **Launch / deploy the API** (from `apps/api`)
   ```bash
   cd apps/api
   fly deploy -a daypilot-api
   ```
   Config: `apps/api/fly.toml` (`app = "daypilot-api"`, health check `/health`).

6. **Set secrets**
   ```bash
   fly secrets set \
     DATABASE_URL="postgresql://..." \
     JWT_SECRET="your-32-char-secret" \
     CORS_ORIGIN="https://www.daypilot.co,https://daypilot.co" \
     FRONTEND_URL="https://www.daypilot.co" \
     API_URL="https://api.daypilot.co"
   ```

7. Your default hostname is `https://daypilot-api.fly.dev`. Point `api.daypilot.co` at the Fly IPs (see status table above).

8. Add `NEXT_PUBLIC_API_URL` in GitHub Actions (same as Railway step 9).

Optional CI: set repo secret `FLY_API_TOKEN` so `.github/workflows/deploy-api.yml` can run `fly deploy` after pushing the image.

---

## After Deployment

1. **GitHub Actions variable**
   - Add `NEXT_PUBLIC_API_URL` with your production API URL so the frontend build uses it.

2. **Re-run deploy-pages** or push to `main` so the frontend rebuilds with the correct API URL.

3. **Verify**
   - Visit `https://your-api-url/health` — should return `{"status":"ok"}` or similar.
   - Billing: `GET /billing/plans` returns `{ configured, plans }` (empty plans until `STRIPE_PRICE_*` are set).
