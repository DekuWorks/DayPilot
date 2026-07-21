# DayPilot Master Progress

**Last updated:** 2026-07-21  
**Milestone:** Rebrand + Web + iOS + Backend (no Android work)  
**Overall status:** [~] Phase 2 rebrand in progress — Supabase + Flutter iOS locked

Status legend: `[ ]` Not started · `[~]` In progress · `[x]` Completed · `[!]` Blocked · `[?]` Needs review

---

## Phase overview

| Phase | Name | Status |
|-------|------|--------|
| 0 | Repository audit | [x] |
| 1 | Foundation | [~] |
| 2 | Rebrand | [~] |
| 3 | Backend core (Supabase) | [ ] |
| 4 | Web core experience | [~] |
| 5 | Pilot Brief & Insights | [ ] |
| 6 | Sharing & booking | [ ] |
| 7 | Integrations | [ ] |
| 8 | iOS foundation (Flutter) | [~] |
| 9 | iOS features | [ ] |
| 10 | Testing & hardening | [ ] |
| 11 | Release preparation | [ ] |

---

## Open blockers

| ID | Blocker | Impact | Next action |
|----|---------|--------|-------------|
| — | None for direction | — | Continue Nest→Supabase migration + shell rebuild |

---

## Session log

### 2026-07-21 — Notifications, richer ⌘K, tasks polish

- **Feature:** Header notifications (meeting reminders), palette search across data, task priorities/subtasks/projects
- **Status:** [x]
- **Owner:** agent
- **Related files:** `NotificationsMenu.tsx`, `notifications-supabase.ts`, `CommandPalette.tsx`, `tasks/page.tsx`
- **Next action:** Realtime notifications; due-date picker; Google OAuth credentials

### 2026-07-21 — Meetings, contacts, insights, command palette

- **Feature:** Meetings list/schedule, Contacts CRUD, Insights + focus timer, ⌘K palette
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `meetings/page.tsx`, `contacts/*`, `insights/page.tsx`, `CommandPalette.tsx`, migration `20260721210000_contacts`
- **Tests added:** none (web lint + build)
- **Notes:** Contacts table + RLS applied remotely; focus sessions wired on Insights
- **Blockers:** Google OAuth still needs provider credentials in Supabase
- **Next action:** Notifications; deeper search in palette; calendar drag/resize

### 2026-07-21 — Official logo + calendar views + notes/projects + magic link

- **Feature:** Official green D mark via `BrandLogo`; month/week/day calendar; Notes + Projects MVP; magic-link auth
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `BrandLogo.tsx`, `CalendarApp.tsx`, `notes-supabase.ts`, `projects-supabase.ts`, `AuthProvider`, login
- **Tests added:** none (web lint + build passed)
- **Notes:** Calendar view switcher with timed create; notes list/editor; projects list/detail; magic link uses `signInWithOtp` → `/auth/callback`
- **Blockers:** Enable Google + confirm Site URL / redirect URLs in Supabase Auth for production
- **Next action:** Meetings MVP; command palette; push deploy when ready

### 2026-07-21 — Events on Supabase + Pilot Brief + Google OAuth

- **Feature:** Supabase event CRUD, Pilot Brief Edge Function, Google OAuth UI
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `events-supabase.ts`, `MonthCalendarView.tsx`, `supabase/functions/pilot-brief`, `pilot-brief/page.tsx`, `auth/callback`, login/signup Google
- **Tests added:** none (web build passed; function deployed)
- **Notes:** Calendar/Home use Supabase events. Pilot Brief deployed with fallback. Google button requires provider enabled in Supabase dashboard + redirect URL.
- **Blockers:** Google provider must be configured manually in Supabase Auth settings
- **Next action:** Day/week calendar views; notes/projects MVP; set OPENAI_API_KEY secret for AI briefs

### 2026-07-21 — Migration applied + Home + Supabase Auth

- **Feature:** `supabase db push`, Home dashboard, web Supabase Auth cutover
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `HomeDashboard.tsx`, `AuthProvider.tsx`, `lib/supabase/*`, `tasks/page.tsx`, remote migration `20260721180000`
- **Tests added:** none (production build passed)
- **Notes:** Web login/signup use Supabase; Nest JWT via `/auth/supabase-exchange` for events/billing bridge. Home widgets + Tasks CRUD on Supabase.
- **Blockers:** none
- **Next action:** Pilot Brief Edge Function; event CRUD on Supabase; disable Nest when parity reached

### 2026-07-21 — App shell + Supabase schema gaps

- **Feature:** Web shell + rebrand schema migration + Flutter icons
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `apps/web/src/components/shell/*`, `supabase/migrations/20260721180000_rebrand_schema_gaps.sql`, Flutter branding
- **Tests added:** none (web production build passed)
- **Notes:** Sidebar/header/workspaces; stub routes for new nav; schema for workspaces/projects/notes/pilot_briefs/etc. with RLS
- **Blockers:** none
- **Next action:** Apply migration (`supabase db push`); rebuild Home dashboard widgets; Supabase auth cutover

### 2026-07-21 — Decisions + brand foundation

- **Feature:** ADR accept + brand assets + tokens + Flutter dark theme
- **Status:** [~]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** —
- **Related files:** `docs/progress/DECISIONS.md`, `docs/architecture/SUPABASE_MIGRATION.md`, `assets/brand/*`, `apps/web/src/styles/tokens.css`, `daypilot_flutter/lib/core/theme/app_theme.dart`
- **Tests added:** none
- **Notes:** Owner chose Supabase backend + Flutter iOS. Nest frozen. New logo/icon/mockups imported. Web dark tokens applied; marketing hero updated.
- **Blockers:** none
- **Next action:** App shell (sidebar) + Supabase schema gap migration

### 2026-07-21 — Phase 0 audit

- **Feature:** Repository audit + progress trackers
- **Status:** [x]
- **Owner:** agent
- **Date started:** 2026-07-21
- **Date completed:** 2026-07-21
- **Related files:** `docs/architecture/REPOSITORY_AUDIT.md`, `docs/progress/*`
- **Tests added:** none (documentation only)
- **Notes:** Confirmed Next.js+Nest+Prisma web stack; Flutter mobile; cream/teal brand; empty shared packages; dual Supabase/Prisma schemas
- **Blockers:** resolved via ADR-001/002
- **Next action:** —

---

## Detail trackers

- [WEB_PROGRESS.md](./WEB_PROGRESS.md)
- [IOS_PROGRESS.md](./IOS_PROGRESS.md)
- [BACKEND_PROGRESS.md](./BACKEND_PROGRESS.md)
- [TESTING_PROGRESS.md](./TESTING_PROGRESS.md)
- [RELEASE_PROGRESS.md](./RELEASE_PROGRESS.md)
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
- [DECISIONS.md](./DECISIONS.md)
