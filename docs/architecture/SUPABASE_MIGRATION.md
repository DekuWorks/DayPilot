# Nest → Supabase Migration Plan

**Status:** Active  
**Related:** ADR-001 (Accepted — Supabase primary)  
**Date:** 2026-07-21

## Goal

Make **Supabase** the single backend for web and Flutter iOS:
Auth, Postgres, RLS, Storage, Realtime, Edge Functions.

`apps/api` (Nest) and `prisma/` become **read-only reference** until feature parity is cut over, then deprecated.

## Ownership after cutover

| Concern | Target |
|---------|--------|
| Auth | Supabase Auth (email, magic link, Google; Microsoft when ready) |
| Profiles, preferences, workspaces, calendars, events, tasks, projects, notes | Supabase Postgres + RLS |
| Pilot Brief / AI | Edge Function (service role; no client AI keys) |
| Calendar OAuth + sync | Edge Functions + encrypted credential storage |
| Billing (Stripe) | Edge Functions + webhooks (port from Nest / legacy) |
| Booking / shared links | Supabase tables + RLS + public policies |
| Realtime | Supabase Realtime (scoped channels) |
| File uploads | Supabase Storage |

## Migration phases

### Phase M0 — Freeze Nest feature work
- No new Nest modules or Prisma models for product features
- Document Nest endpoints → Supabase equivalents (below)

### Phase M1 — Schema alignment
- Expand `supabase/migrations/` to cover plan domains (workspaces, tasks, projects, notes, focus, pilot_briefs, notifications, integration_connections)
- UUID PKs, `timestamptz`, indexes, `updated_at` triggers, soft delete where needed
- Seed data for local `supabase start`
- Generate TS types into `packages/types` (or `packages/database`)

### Phase M2 — Web auth cutover
- Replace Nest JWT + `localStorage` with Supabase Auth in `apps/web`
- Protected routes via session
- Migrate existing Nest users if needed (one-time script; email match)

### Phase M3 — Data plane cutover
- Web events/tasks → Supabase client with RLS
- Flutter: remove Option C Nest exchange for events; use Supabase repositories only
- Port billing/AI/calendar OAuth to Edge Functions

### Phase M4 — Decommission
- Stop deploying Nest API
- Archive `apps/api` + `prisma` (or move under `archive/`)
- Update env docs: remove `JWT_SECRET` / Nest-only vars; document Supabase keys

## Nest endpoint → Supabase mapping

| Nest | Supabase target |
|------|-----------------|
| `POST /auth/signup\|login\|refresh` | Supabase Auth |
| `GET /auth/me` | `profiles` + session |
| `POST /auth/supabase-exchange` | Remove after Flutter uses Supabase-only data |
| `/events` CRUD | `events` + RLS |
| `/billing/*` | Edge Functions + Stripe |
| `/ai/suggest-schedule` | Edge Function `pilot-brief` / `suggest-schedule` |
| `/calendar-connections/*` | Edge Functions + `integration_connections` |
| WebSocket `/ws` | Supabase Realtime |

## Logic to port (do not lose)

From `apps/api` and `archive/legacy-v1/supabase/functions/`:
- Google/Outlook OAuth + sync
- Stripe checkout/portal/webhook
- AI schedule / generate-day
- Email reminders / booking confirmation (legacy functions)

## Rules during migration

1. Never duplicate writes to Nest and Supabase for the same entity.
2. Never expose service role key or OAuth secrets to web/Flutter clients.
3. Every user table gets RLS before production use.
4. Add RLS tests for cross-user access denial.
5. Update `docs/progress/BACKEND_PROGRESS.md` after each slice.

## Immediate next backend tasks

1. Audit existing `supabase/migrations` vs plan schema; gap list
2. New migration(s) for missing tables (workspaces, enhanced profiles, pilot_briefs, etc.)
3. Local Supabase setup doc refresh (`docs/SUPABASE_SETUP.md`)
4. Shared `@daypilot` types + validation packages
5. Web Supabase client scaffolding (parallel to Nest until M2 cutover)
