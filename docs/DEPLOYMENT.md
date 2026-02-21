# Deployment & domain (DayPilot)

**Production:** [daypilot.co](https://daypilot.co) — domain is connected. Pushes to `main` deploy to this domain (via Vercel or your connected host).

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

## 4. CI/CD (optional)

Use GitHub Actions to keep **main** and deployments in sync:

- **On push to `main`:**
  - Run tests/lint (e.g. `pnpm run build`, `pnpm run lint`).
  - Optionally trigger or notify your deployment (Vercel usually auto-deploys on push; backend can be wired to deploy on success).

Example: see `.github/workflows/ci.yml` (if added) for a simple build-and-lint job that runs toward the repo and keeps main green.

---

## 5. Summary

| What              | Where        | Purpose                          |
|-------------------|-------------|-----------------------------------|
| Source of truth   | GitHub main | All code and config              |
| Frontend / domain | Vercel      | Next.js app at daypilot.co       |
| API               | Railway/Fly/etc. | Nest API at api.daypilot.co |
| DB                | Hosted Postgres | Production `DATABASE_URL`   |

Once the repo is pushed to **main** and the frontend is connected to your domain, your changes are “running towards the domain and the repo via GitHub.”
