# Backend Progress

**Last updated:** 2026-07-21

| Feature | Status | Owner | Started | Completed | Related files | Tests | Notes | Blockers | Next action |
|---------|--------|-------|---------|-----------|---------------|-------|-------|----------|-------------|
| Nest API core (auth/events/billing/AI) | [x] | — | — | — | `apps/api` | minimal | Frozen — do not extend | — | Port to Edge Functions |
| Prisma schema (current) | [x] | — | — | — | `prisma/schema.prisma` | — | Legacy reference | — | Archive after cutover |
| Supabase migrations (active) | [x] | agent | 2026-07-21 | 2026-07-21 | remote = local through `20260721180000` | — | Pushed to project wmkytyrcxbzjqiykbauw | — | Seed data |
| Tasks API | [x] | agent | 2026-07-21 | 2026-07-21 | tasks + RLS + web UI | — | Client CRUD via Supabase | — | Subtasks UI |
| Pilot Brief endpoint | [x] | agent | 2026-07-21 | 2026-07-21 | `supabase/functions/pilot-brief` | — | Deployed; fallback without AI key | — | Set OPENAI_API_KEY secret |
| Web Auth cutover | [x] | agent | 2026-07-21 | 2026-07-21 | AuthProvider, supabase client | — | Supabase Auth + Nest exchange bridge | — | Drop Nest when ready |
| Events on Supabase | [x] | agent | 2026-07-21 | 2026-07-21 | `events-supabase.ts` | — | Home + Calendar wired | — | Recurrence |
| Google OAuth (Auth) | [~] | agent | 2026-07-21 | — | login/signup + `/auth/callback` | — | UI ready | Enable Google in Supabase dashboard | Add redirect URLs |
| SOT decision | [x] | owner | 2026-07-21 | 2026-07-21 | DECISIONS.md, SUPABASE_MIGRATION.md | — | Supabase primary; Nest frozen | — | — |
| Profiles / preferences (plan) | [~] | agent | 2026-07-21 | — | `20260721180000_*.sql` | — | Columns added | — | Wire web/Flutter |
| Workspaces | [~] | agent | 2026-07-21 | — | workspaces + members + RLS | — | Personal bootstrap trigger | — | Seed + API client |
| Tasks API | [~] | agent | 2026-07-21 | — | tasks + subtasks | — | Schema ready; no Nest | — | Supabase client CRUD |
| Projects / notes / focus | [~] | agent | 2026-07-21 | — | projects, notes, focus_sessions | — | Tables + RLS | — | UI |
| Pilot Brief endpoint | [~] | agent | 2026-07-21 | — | pilot_briefs table | — | Table ready; EF TBD | — | Edge Function |
| Booking / shared links (Nest) | [ ] | — | — | — | Supabase + Flutter | — | Already in earlier migrations | — | Web public routes |
| Encrypt calendar tokens | [~] | agent | 2026-07-21 | — | integration_connections | — | Reference column; no secrets to client | — | Vault + Edge OAuth |
| RLS / authz tests | [ ] | — | — | — | — | — | Policies added; untested | — | Automated tests |
| Shared API client + Zod | [ ] | — | — | — | packages empty | — | — | — | Create packages |
| Seed data | [ ] | — | — | — | — | — | — | Schema | Add seed |
