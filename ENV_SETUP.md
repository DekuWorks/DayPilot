# Environment Variables Setup

This document lists all environment variables needed for DayPilot.

## Frontend Environment Variables

Create `apps/web/.env` with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Edge Functions Secrets

Set these using Supabase CLI:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
```

These are automatically available to Edge Functions:

- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

## Optional: AI Configuration (Future)

For future AI features:

```env
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
   - service_role key → Use for Edge Functions (auto-provided)

## Getting Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys in dashboard
3. Create a new API key
4. Copy the key → Use for `RESEND_API_KEY`

## Production verification (GitHub Pages / www.daypilot.co)

For production at **https://www.daypilot.co** (CNAME: `www.daypilot.co`):

1. **GitHub Actions secrets** (Settings → Secrets and variables → Actions):
   - `VITE_SUPABASE_URL` = your Supabase project URL, e.g. `https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the **anon/public** key from the same project (Settings → API in Supabase dashboard)

2. **Confirm build uses real values**: After a deploy, open DevTools → Network and trigger "Discover" — the request should go to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-discover`, not to your app domain or a placeholder.

3. **Session**: User must be signed in (Supabase session). If "Discover" fails, check that the session exists (e.g. refresh the page and try again; ensure cookies for the app domain are allowed).

### SPA routing (www.daypilot.co)

- **Fallback**: The deploy workflow copies `index.html` to `404.html`. GitHub Pages serves `404.html` for any path that has no file (e.g. `/app/integrations`). That loads the React app and React Router handles the route. This applies to **www.daypilot.co** and any path under it (CNAME is `www.daypilot.co`).
- **Check**: Open `https://www.daypilot.co/app/integrations` — it should load the Integrations page; React Router then handles the route.
- **Query params**: Routes like `https://www.daypilot.co/app/integrations?foo=bar` work; the app loads and React Router receives the query string.
- **404 in DevTools**: On GitHub Pages, when you open a deep link (e.g. `/login`, `/app/integrations`, `/signup`) or refresh on that URL, the **document** request returns **HTTP 404** because GitHub serves `404.html` with a 404 status. The page still loads (the response body is the SPA), so the app works; the 404 in the console is expected and can be ignored. The `/login` route exists in the app (React Router); there is no typo—the server simply has no file at that path, so it serves the SPA via `404.html`. If you want **200** for those URLs (no 404 in DevTools), deploy to Netlify or Vercel instead—`netlify.toml` and `vercel.json` already have SPA rewrites that serve `index.html` with 200.

### "Failed to send a request to the Edge Function" (Google Calendar discovery)

If connecting Google Calendar shows "Failed to discover calendars: Failed to send a request to the Edge Function":

1. **Production URL**: The built app must have your real Supabase URL. For GitHub Pages, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the repo’s **Settings → Secrets and variables → Actions**, then push a new commit or re-run the "Deploy to GitHub Pages" workflow so the build uses them.
2. **Edge Function deployed**: Deploy the discover function: `supabase functions deploy google-discover`. In Supabase Dashboard → Edge Functions, ensure `google-discover` is listed.
3. **Function secrets**: Set Google OAuth secrets for the function: `supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...` (see GOOGLE_OAUTH_SETUP.md).
4. **Verify in browser**: After redeploying, open DevTools → Network, go to Integrations, and trigger discovery. You should see a POST to `https://YOUR_PROJECT.supabase.co/functions/v1/google-discover`. If the request goes elsewhere or fails, the build is still using the wrong URL.
