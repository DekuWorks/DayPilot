# Deployment & domain (DayPilot)

**Production:** [daypilot.co](https://daypilot.co) — domain is connected. Pushes to `main` deploy to this domain (via Vercel or your connected host).

---

## 0. DB migration strategy

- **Local / dev:** `pnpm db:migrate` (interactive; creates new migrations).
- **Production / CI:** `pnpm db:migrate:deploy` only. Never run `prisma migrate dev` in production.
- **When to run:** Before starting the API after a deploy. Run once per release (e.g. in your API host’s release step or a small job that runs `prisma migrate deploy` then starts the app).
- **Backups:** Back up Postgres before running migrations in production (e.g. snapshot or `pg_dump`).

---

## 1. GitHub (main repo)

- **Repo:** Push all work to the **main** branch of your GitHub repo (e.g. `DekuWorks/DayPilot`).
- **Branch:** Use `main` for production; feature branches can merge into `main`.
- **Secrets:** Never commit `.env` or secrets. Use GitHub Actions secrets or your host’s env config for production.

After you push, the repo is the source of truth. Any deployment (Vercel, backend host) should build from this repo.

---

## 2. Frontend (Next.js) → domain

**Recommended: Vercel** (same team as Next.js, simple domain setup).

1. **Connect repo**
   - Go to [vercel.com](https://vercel.com) → Add New → Project → Import your GitHub repo (e.g. `DekuWorks/DayPilot`).

2. **Configure project**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** `apps/web` (monorepo).
   - **Build Command:** `cd ../.. && pnpm install && pnpm run build --filter @daypilot/web` (or use Vercel’s “Build Command” override to run from repo root with filter).
   - **Output Directory:** `.next` (default for Next.js).
   - **Install Command:** `pnpm install` (run from repo root if root is selected; or set root to `apps/web` and use `pnpm install` there if you use a workspace root in Vercel).

   Simpler option: set **Root Directory** to `apps/web`, and in that directory run `pnpm install` and `pnpm run build` (ensure `apps/web` has its own `package.json` and lockfile or that Vercel runs from repo root; for monorepos, many teams set root to repo root and build command to `pnpm run build --filter @daypilot/web`).

3. **Environment variables**
   - Add any needed env vars in Vercel (e.g. `NEXT_PUBLIC_API_URL` pointing to your API).

4. **Domain**
   - In Vercel: Project → Settings → Domains → Add `daypilot.co` (and `www.daypilot.co` if you want).
   - At your DNS provider, add the CNAME/A records Vercel shows (usually `cname.vercel-dns.com` or similar).

After deployment, your domain will serve the Next.js app from the **main** branch (or the branch you connected).

---

## 3. Backend (NestJS API)

Deploy the API to a host that runs Node (e.g. **Railway**, **Fly.io**, **Render**, or **AWS**).

1. **Build from repo**
   - Use the same GitHub repo; build from repo root:
   - Install: `pnpm install`
   - Build API: `pnpm run build --filter @daypilot/api`
   - Run: `node apps/api/dist/main.js` (or `pnpm start --filter @daypilot/api` if configured).

2. **Environment variables**
   - Set `DATABASE_URL` (production Postgres), `PORT`, `JWT_SECRET`, etc., in the host’s env (no `.env` in repo).

3. **Domain**
   - Point a subdomain to the API (e.g. `api.daypilot.co` → your API host). Set `NEXT_PUBLIC_API_URL` (or similar) in Vercel to this URL.

---

## 4. Staging

- **Frontend:** Vercel **Preview** deployments (per PR or branch) give you a staging URL. Set `NEXT_PUBLIC_API_URL` for that preview to your staging API URL.
- **API:** Deploy the same API to a second app (e.g. Fly.io “staging” app or a separate Railway project) with a **staging** `DATABASE_URL` (separate Postgres DB). Run `pnpm db:migrate:deploy` against that DB on deploy.
- **Secrets:** Use separate Stripe/OAuth keys for staging if you want to avoid touching production data.

---

## 5. Env & secrets

Set these in your host (Vercel, Fly.io, Railway, etc.). Never commit `.env` or secrets.

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | API | Postgres connection string |
| `JWT_SECRET` | API | Min 32 chars; sign/verify JWTs |
| `CORS_ORIGIN` | API | Frontend origin (e.g. `https://daypilot.co`) |
| `PORT` | API | Server port (e.g. 3001) |
| `FRONTEND_URL` | API | Frontend base URL (OAuth redirects, Stripe) |
| `API_URL` | API | API base URL (OAuth callback base) |
| `NEXT_PUBLIC_API_URL` | Web | API base URL (browser) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | API | Billing (optional) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `AI_PROVIDER` | API | AI scheduling (optional) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | API | Google Calendar (optional) |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | API | Outlook Calendar (optional) |

---

## 6. CI/CD

- **`.github/workflows/ci.yml`:** On push/PR to `main`, runs install, Prisma generate, build, and lint. Keeps `main` green.
- **`.github/workflows/deploy-api.yml`:** On push to `main`, builds the API Docker image and pushes to GHCR. Use that image in your API host; run `prisma migrate deploy` before starting the container.

Vercel usually auto-deploys the frontend on push to `main` (or your connected branch).

---

## 7. Summary

| What              | Where        | Purpose                          |
|-------------------|-------------|-----------------------------------|
| Source of truth   | GitHub main | All code and config              |
| Frontend / domain | Vercel      | Next.js app at daypilot.co       |
| API               | Railway/Fly/Docker | Nest API at api.daypilot.co |
| DB                | Hosted Postgres | Production `DATABASE_URL`; run `db:migrate:deploy` on release |
| Staging           | Vercel Preview + staging API/DB | Per-PR or branch preview |

Once the repo is pushed to **main** and the frontend is connected to your domain, your changes are “running towards the domain and the repo via GitHub.”
