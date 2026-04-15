# Create a Production API URL

You need to deploy the DayPilot API to a host that provides a public URL. Here are two options.

---

## Option A: Railway (fastest)

1. **Sign up** at [railway.app](https://railway.app).

2. **Create a project** → **Deploy from GitHub** → select `DekuWorks/DayPilot`.

3. **Add Postgres**  
   - In the project: **New** → **Database** → **PostgreSQL**  
   - Railway creates a `DATABASE_URL` for you.

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
   | `CORS_ORIGIN` | `https://daypilot.co` or your frontend URL |
   | `API_URL` | `https://<your-app>.up.railway.app` |
   | `PORT` | `3001` |

7. **Deploy** — Railway gives you a URL like `https://daypilot-api-production.up.railway.app`.

8. **Add `NEXT_PUBLIC_API_URL` to GitHub Actions**  
   - Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**  
   - Add `NEXT_PUBLIC_API_URL` = `https://<your-app>.up.railway.app`

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

3. **Create Postgres**
   ```bash
   fly postgres create
   ```
   Note the `DATABASE_URL` (or attach it later).

4. **Launch the API** (from repo root)
   ```bash
   cd apps/api
   fly launch
   ```
   Use the existing `fly.toml`, or let `fly launch` create one.

5. **Set secrets**
   ```bash
   fly secrets set DATABASE_URL="postgresql://..." JWT_SECRET="your-32-char-secret" CORS_ORIGIN="https://daypilot.co" API_URL="https://daypilot-api.fly.dev"
   ```

6. **Deploy**
   ```bash
   fly deploy
   ```

7. Your API URL will be `https://daypilot-api.fly.dev` (or the app name you chose).

8. Add `NEXT_PUBLIC_API_URL` in GitHub Actions (same as Railway step 8).

---

## After Deployment

1. **GitHub Actions variable**
   - Add `NEXT_PUBLIC_API_URL` with your production API URL so the frontend build uses it.

2. **Re-run deploy-pages** or push to `main` so the frontend rebuilds with the correct API URL.

3. **Verify**
   - Visit `https://your-api-url/health` — should return `{"status":"ok"}` or similar.
