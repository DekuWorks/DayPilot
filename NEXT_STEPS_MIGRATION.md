# Next Steps: Migration Off Supabase (Phase 1)

Step-by-step walkthrough to run auth and Google integrations on the DayPilot API (no Supabase for auth/connect).

---

## Overview

1. Get a **PostgreSQL** database (or use SQLite locally).
2. Configure and **deploy the API** (Fly.io).
3. Update **Google Cloud Console** redirect URIs.
4. Set **Fly secrets** (and optional Postgres).
5. Set **frontend env** and redeploy the web app.
6. **Test** login, sign-up, Connect Google, and discover.

---

## Step 1: Get a PostgreSQL database (production)

For production (e.g. Fly.io), use PostgreSQL. Options:

### Option A: Fly Postgres (same platform as your API)

```bash
# Create a Postgres app (run once)
fly postgres create --name daypilot-db --region iad

# When prompted: no for snapshot, choose a password and SAVE IT.
# After creation, attach it to your API app:
fly postgres attach daypilot-db --app daypilot-api
```

This sets `DATABASE_URL` as a secret on `daypilot-api`. The API reads **ConnectionStrings:DefaultConnection**; Fly injects `DATABASE_URL` — we’ll map it in Step 4.

### Option B: Supabase Postgres (reuse existing project)

1. Supabase Dashboard → **Project Settings** → **Database**.
2. Copy **Connection string** (URI format). Use the **Connection pooling** URI if available (e.g. port 6543).
3. Replace placeholder password. Example:
   `postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres`
4. You’ll put this in Fly secrets as `ConnectionStrings__DefaultConnection` (Step 4).

### Option C: Other Postgres (Neon, Railway, etc.)

Create a database, copy the connection string (e.g. `postgresql://user:pass@host:5432/dbname`), and use it in Step 4 as `ConnectionStrings__DefaultConnection`.

**Local dev:** You can keep using SQLite (default `Data Source=daypilot.db`) and skip Postgres locally.

---

## Step 2: Configure the API locally (optional check)

From repo root:

```bash
cd api/DayPilot.Api
```

Ensure `appsettings.Development.json` or `appsettings.json` has (for local run with Postgres you’d set a real connection string here; for local SQLite you can leave default):

- **ConnectionStrings:DefaultConnection** — `Data Source=daypilot.db` (SQLite) or your Postgres URI.
- **Google:ClientId** / **Google:ClientSecret** — from Google Cloud Console.
- **Jwt:Secret** — any long random string (e.g. 32+ chars).
- **FrontendUrl** — `https://www.daypilot.co` (or your frontend URL).

Run locally to confirm it starts:

```bash
dotnet run
```

Then open `http://localhost:5000/swagger`. Stop when done.

---

## Step 3: Google Cloud Console — redirect URIs

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Click your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**:
   - **Remove** any Supabase URLs (e.g. `https://xxx.supabase.co/auth/v1/callback`, `.../functions/v1/google-oauth-callback`).
   - **Add** these two (replace host if your API is different):
     - `https://daypilot-api.fly.dev/api/auth/google/callback`
     - `https://daypilot-api.fly.dev/api/google/callback`
4. **Save**.

---

## Step 4: Set Fly secrets and deploy API

From repo root:

```bash
cd api/DayPilot.Api
```

Set secrets (replace placeholders with your real values):

```bash
# Required
fly secrets set Google__ClientId=YOUR_GOOGLE_CLIENT_ID
fly secrets set Google__ClientSecret=YOUR_GOOGLE_CLIENT_SECRET
fly secrets set Jwt__Secret=YOUR_LONG_RANDOM_STRING_AT_LEAST_32_CHARS
fly secrets set FrontendUrl=https://www.daypilot.co
fly secrets set Cors__AllowedOrigins__0=https://www.daypilot.co
# Add more origins if needed, e.g.:
# fly secrets set Cors__AllowedOrigins__1=https://daypilot.co
# fly secrets set Cors__AllowedOrigins__2=http://localhost:5174
```

If you’re using **Postgres**:

- **Fly Postgres (attach already done):** The API reads `DATABASE_URL` automatically after `fly postgres attach`. No extra secret needed.
- **External Postgres (Supabase / Neon / etc.):** Set the connection string as a secret:
  ```bash
  fly secrets set ConnectionStrings__DefaultConnection="postgresql://user:password@host:5432/dbname"
  ```

Deploy:

```bash
fly deploy --remote-only
```

Check:

- `https://daypilot-api.fly.dev/health` → `{"status":"ok"}`
- `https://daypilot-api.fly.dev/swagger` → Swagger UI

---

## Step 5: Frontend — set env and redeploy

Your web app (e.g. Netlify, GitHub Pages, Vercel) must use the API for auth and integrations.

1. In the **build/deploy** environment for the web app, add:
   - **Variable name:** `VITE_API_URL`
   - **Value:** `https://daypilot-api.fly.dev`  
   (no trailing slash; use your API URL if different.)

2. **Optional but recommended** when fully off Supabase for auth:
   - Remove or leave unset: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
   so the app uses only the DayPilot API for login/signup and Connect Google.

3. **Redeploy** the frontend so the new env is baked in.

---

## Step 6: Test the flow

1. **Sign up**
   - Open `https://www.daypilot.co/signup` (or your frontend URL).
   - Sign up with email/password or “Sign in with Google”.
   - You should land on `/app` (and with Google, URL may briefly have `?token=...` then be cleaned).

2. **Connect Google (Integrations)**
   - Go to **Integrations** (or `/app/integrations`).
   - Click **Connect Google**.
   - Authorize in Google; you should return to Integrations with a success message.

3. **Discover calendars**
   - On Integrations, click **Discover** (or similar) for the connected account.
   - You should see a list of Google calendars.

4. **Logout**
   - For now, “logout” = clear the API token: in browser DevTools → Application → Local Storage → remove `daypilot_api_token` (or your site’s key). Or add a Logout button that clears it and redirects to `/login`.

---

## Checklist

- [ ] Postgres (or SQLite for local) chosen and connection string ready.
- [ ] Google Cloud Console: old Supabase redirect URIs removed; `.../api/auth/google/callback` and `.../api/google/callback` added.
- [ ] Fly secrets set: `Google__ClientId`, `Google__ClientSecret`, `Jwt__Secret`, `FrontendUrl`, `Cors__AllowedOrigins__0`. If using external Postgres (not Fly Postgres attach), also set `ConnectionStrings__DefaultConnection`.
- [ ] API deployed: `fly deploy --remote-only`; `/health` and `/swagger` work.
- [ ] Frontend env: `VITE_API_URL=https://daypilot-api.fly.dev` set and frontend redeployed.
- [ ] Sign up, Connect Google, and Discover tested.

---

## If something breaks

- **“Unauthorized” on /api/me or Connect Google:** Frontend must send the JWT (e.g. in `Authorization: Bearer <token>`). Ensure `VITE_API_URL` is set so the app uses API mode and stores the token (e.g. from login or `?token=` after Google sign-in).
- **Google “redirect_uri_mismatch”:** The redirect URI in Google Console must match exactly (no trailing slash): `https://daypilot-api.fly.dev/api/auth/google/callback` and `https://daypilot-api.fly.dev/api/google/callback`.
- **Database errors on Fly:** Confirm `ConnectionStrings__DefaultConnection` is set (and that it’s the correct Postgres URL). For Fly Postgres, ensure the app is attached and you’re using the internal URL/password from the Postgres app.
- **CORS errors:** Add your frontend origin to `Cors__AllowedOrigins__0`, `__1`, etc., in Fly secrets and redeploy.

For more detail on the API (endpoints, config, Fly deploy), see **api/README.md**. For the overall migration plan (Phase 2/3), see **MIGRATION_OFF_SUPABASE.md**.
