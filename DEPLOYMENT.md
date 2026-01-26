# Deployment Guide

This guide covers deploying DayPilot to production.

## Prerequisites

1. **Supabase Project** - Production Supabase project set up
2. **Resend Account** - For email notifications
3. **Vercel Account** (or alternative hosting)
4. **Domain** (optional but recommended)

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides excellent support for React/Vite applications with automatic deployments.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Link Your Project

```bash
cd /path/to/DayPilot
vercel
```

Follow the prompts to link your project.

#### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Step 4: Configure Build Settings

Vercel should auto-detect the settings from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Build Command**: `cd ../.. && pnpm build`
- **Output Directory**: `apps/web/dist`
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
- **Root Directory**: Leave empty (or set to root)

#### Step 5: Deploy

```bash
vercel --prod
```

Or push to `main` branch for automatic deployments.

### Option 2: Netlify

#### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Step 2: Create `netlify.toml`

```toml
[build]
  command = "cd ../.. && pnpm build"
  publish = "apps/web/dist"

[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "8.15.9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 3: Deploy

```bash
netlify deploy --prod
```

### Option 3: Self-Hosted (Docker)

#### Create `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@8.15.9

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Create `nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Build and Run

```bash
docker build -t daypilot .
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  daypilot
```

## Supabase Edge Functions Deployment

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login and Link

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Set Secrets

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Step 4: Deploy Functions

```bash
supabase functions deploy send-reminders
supabase functions deploy send-booking-confirmation
```

## Set Up Cron Job for Reminders

### Option A: Supabase pg_cron (Recommended)

1. Enable extension in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Schedule the job:

```sql
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Option B: GitHub Actions

The workflow is already set up in `.github/workflows/send-reminders.yml`. Just add secrets:

- `SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`

## Environment Variables Checklist

### Frontend (Vercel/Netlify)

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions

- [ ] `RESEND_API_KEY` (set via `supabase secrets`)
- [ ] `RESEND_FROM_EMAIL` (set via `supabase secrets`)

### GitHub Actions (if using)

- [ ] `VERCEL_TOKEN` (for deployments)
- [ ] `SUPABASE_ANON_KEY` (for reminder cron)
- [ ] `SUPABASE_PROJECT_REF` (for reminder cron)

## Post-Deployment Checklist

- [ ] Verify frontend is accessible
- [ ] Test authentication (sign up, login)
- [ ] Test booking flow end-to-end
- [ ] Verify email notifications work
- [ ] Check Edge Functions logs
- [ ] Verify cron job is running
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Set up analytics (PostHog, etc.)
- [ ] Configure custom domain (if applicable)
- [ ] Set up SSL certificate (automatic on Vercel/Netlify)

## Monitoring

### Check Edge Function Logs

```bash
supabase functions logs send-reminders --tail
supabase functions logs send-booking-confirmation --tail
```

### Check Cron Job Status

```sql
SELECT * FROM cron.job WHERE jobname = 'send-reminders';
SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-reminders') ORDER BY start_time DESC LIMIT 10;
```

## Troubleshooting

### Build Fails

1. Check Node.js version (should be 20+)
2. Verify pnpm version (8.15.9)
3. Clear cache: `pnpm store prune`
4. Check for TypeScript errors: `pnpm type-check`

### Environment Variables Not Working

1. Verify variables are set in hosting platform
2. Restart deployment after adding variables
3. Check variable names (must start with `VITE_` for Vite)

### Edge Functions Not Working

1. Check secrets are set: `supabase secrets list`
2. Verify function is deployed: `supabase functions list`
3. Check function logs for errors
4. Verify Resend API key is valid

### Emails Not Sending

1. Check Resend dashboard for delivery status
2. Verify domain is verified in Resend
3. Check spam folder
4. Review Edge Function logs

## Production Best Practices

1. **Use Environment-Specific Supabase Projects**
   - Separate dev/staging/production projects
   - Different API keys per environment

2. **Enable RLS on All Tables**
   - Already configured in migrations
   - Double-check policies are correct

3. **Set Up Error Tracking**
   - Sentry, LogRocket, or similar
   - Monitor Edge Function errors

4. **Set Up Analytics**
   - PostHog, Mixpanel, or Google Analytics
   - Track key user actions

5. **Regular Backups**
   - Supabase provides automatic backups
   - Consider additional backup strategy

6. **Monitor Performance**
   - Use Vercel Analytics or similar
   - Monitor Edge Function execution time

7. **Security**
   - Never commit API keys
   - Use environment variables
   - Enable 2FA on all accounts
   - Regular security audits

## Rollback Procedure

### Vercel

```bash
vercel rollback [deployment-url]
```

Or use Vercel dashboard to rollback to previous deployment.

### Supabase Functions

```bash
supabase functions deploy send-reminders --version [previous-version]
```

## Support

For issues or questions:

1. Check logs first
2. Review documentation
3. Check GitHub issues
4. Contact support
