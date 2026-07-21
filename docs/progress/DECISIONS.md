# Architecture Decisions

**Last updated:** 2026-07-21

Status: `Proposed` · `Accepted` · `Rejected` · `Superseded`

---

## ADR-001 — Backend source of truth

**Status:** Accepted  
**Date:** 2026-07-21  
**Decided by:** Product owner

### Context
The monorepo runs NestJS + Prisma + Postgres for web, while Supabase powers Flutter auth (Option C). The master plan prefers Supabase as primary.

### Decision
**B. Supabase primary** for all backend concerns going forward:
- Supabase Auth
- PostgreSQL via Supabase
- Row Level Security
- Supabase Storage
- Supabase Realtime where useful
- Edge Functions for trusted server workflows (AI/Pilot Brief, OAuth token handling, billing webhooks, reminders)

NestJS + Prisma are **legacy** during migration: no new Nest features; web and Flutter move to Supabase clients and Edge Functions. Prisma/Nest remain readable for porting business logic until cutover.

### Consequences
- Schema and migrations live under `supabase/migrations/`
- Generate TypeScript types from Supabase
- Web auth migrates from Nest JWT/`localStorage` to Supabase Auth (session cookies or SSR helpers)
- Flutter drops Nest event path (`DAYPILOT_API_URL` / supabase-exchange) once events live in Supabase with RLS
- Encrypt integration credentials; never expose service role or provider secrets to clients
- See `docs/architecture/SUPABASE_MIGRATION.md`

---

## ADR-002 — Mobile stack for this milestone

**Status:** Accepted  
**Date:** 2026-07-21  
**Decided by:** Product owner

### Decision
**B. Flutter iOS-only** for this milestone.
- Continue `daypilot_flutter/` as the iOS application
- Apply new DayPilot brand (dark + electric green, new icon/splash)
- Optimize and QA for iPhone / TestFlight
- **Do not** build, configure, test, or optimize Android deliverables in this phase
- **Do not** scaffold Expo/React Native `apps/ios`

### Consequences
- iOS progress tracks Flutter paths
- Android folder may remain in the Flutter project but is frozen (no milestone work)
- Push/TestFlight use existing Flutter release docs/workflows, updated for new brand

---

## ADR-003 — Keep Next.js (do not migrate to Vite)

**Status:** Accepted  
**Date:** 2026-07-21

### Context
Plan lists Vite; production web is Next.js 16 App Router on daypilot.co.

### Decision
**Keep Next.js** for web marketing + app.

### Consequences
- Marketing and app remain in `apps/web`
- Use Next + `@supabase/ssr` (or equivalent) for auth when web cuts over to Supabase
