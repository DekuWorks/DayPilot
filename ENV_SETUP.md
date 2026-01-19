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
