# DayPilot Repository Audit (Phase 0)

**Date:** 2026-07-21  
**Scope:** Full monorepo inspection prior to rebrand + web/iOS/backend rebuild  
**Status:** Complete — no destructive rewrite until decisions in §8 are confirmed

---

## 1. Repository architecture summary

DayPilot is a **pnpm + Turborepo monorepo** with an active Nest/Prisma web stack, a parallel Flutter mobile client, and archived legacy Supabase/Vite/ASP.NET code.

```
daypilot/
├── apps/
│   ├── web/                 # Next.js 16 (App Router) — marketing + authenticated app
│   └── api/                 # NestJS 11 — JWT auth, events, billing, AI, calendar OAuth
├── packages/
│   ├── ui/                  # Stub — empty exports
│   └── lib/                 # Stub — empty exports
├── prisma/                  # Source of truth for Nest API schema + migrations
├── supabase/                # Migrations + config (used primarily by Flutter / Option C)
├── daypilot_flutter/        # Flutter mobile (iOS + Android toolchain present)
├── archive/legacy-v1/       # Prior Vite + ASP.NET + Supabase Edge Functions snapshot
├── docs/                    # Setup, deployment, Flutter, Supabase alignment
├── docker/ + docker-compose.yml
└── .github/workflows/       # CI build/lint, API deploy, Pages, Flutter CI/release
```

| Layer | Current stack | Master plan target |
|-------|---------------|--------------------|
| Web | **Next.js 16**, React 19, Tailwind 4, TanStack Query, Zustand | Vite + React 18 (recommend **keep Next.js**) |
| API | **NestJS + Prisma + Postgres** | Supabase Auth/DB/RLS/Edge Functions |
| Mobile | **Flutter** (`daypilot_flutter/`) | React Native + Expo (iOS only this phase) |
| Auth (web) | Nest JWT (access + refresh) in `localStorage` | Supabase Auth |
| Auth (mobile) | Supabase Auth → Nest `/auth/supabase-exchange` (Option C) | Supabase Auth + SecureStore |
| Shared packages | Empty stubs | `ui-web`, `ui-native`, `api-client`, `validation`, `types`, etc. |
| Brand | Cream / teal / gold light theme | Dark + electric green (`#42E85F` / `#8CFF3F`) |

**Live site:** daypilot.co (deploys from `main`).

**Chosen production hybrid (documented):** Option C — Flutter uses Supabase Auth; events/calendar go through Nest when `DAYPILOT_API_URL` is set. Web talks only to Nest + Prisma Postgres.

---

## 2. Existing functionality that can be preserved

### Backend (`apps/api`) — high reuse value
- Email/password auth: signup, login, logout, refresh, `GET /auth/me`
- Supabase JWT exchange: `POST /auth/supabase-exchange` (JWKS / legacy HS256)
- Events CRUD with `source` enum (`native` | `google` | `outlook` | `apple` | `booking`)
- Stripe billing: checkout, portal, webhook
- AI schedule suggestions (`OpenAI` / Anthropic / OpenAI-compatible)
- Google + Outlook calendar connection OAuth flows (list/connect/disconnect/discover)
- WebSocket gateway for event realtime
- Health, metrics, audit log, throttling, CORS, Sentry hooks

### Web (`apps/web`) — preserve flows, rebuild UI
- Marketing: home, features, pricing
- Auth: login, signup
- App routes: dashboard (month calendar + AI suggest), calendar, integrations, billing, settings
- Client API modules: `auth-api`, `events-api`, `billing-api`, `calendar-connections-api`, `ai-api`
- AuthProvider + RequireAuth + Socket hook

### Flutter (`daypilot_flutter/`) — product UX reference only if migrating to RN
- Auth (login/signup/forgot), dashboard, month/week/day calendar, event CRUD
- Public booking, attendees/RSVP, insights + daily brief screens
- Integrations screen, local/push notification wiring, offline-friendly caching
- Theme currently cream/teal (not new brand)

### Database / migrations
- **Prisma:** User, RefreshToken, Event, Task (model only), Organization, Team, CalendarConnection, Subscription, AuditLog
- **Supabase SQL:** profiles, calendars, events, tasks, categories, attendees, share_links, preferences, reminders, booking_links, availability, organizations + members, RLS policies, realtime/RSVP policies

### Legacy archive (reference / port candidates)
- Edge Functions: `generate-day`, Google OAuth/sync, Stripe, email/reminders/RSVP/booking confirmation
- Broader Supabase schema + billing entitlements migrations

### Docs / DevOps
- Deployment, Postgres setup, calendar integrations, Option C, observability, Flutter release workflows
- CI: install → Prisma generate → build → lint

### New brand inputs (session assets — not yet in-repo)
- Dashboard mockup, logo mark, iOS UI showcase, iOS app icon PNGs under Cursor project assets

---

## 3. Current technical debt

1. **Dual backend / dual schema** — Prisma (Nest) and Supabase migrations diverge; events may live in different stores depending on client path.
2. **Empty shared packages** — `@daypilot/ui` and `@daypilot/lib` export nothing; no shared validation/types/API client.
3. **Brand mismatch** — Entire web + Flutter UI uses cream/teal/gold; no electric-green dark system tokens.
4. **No design system** — Single `Button` component; no sidebar shell matching approved dashboard.
5. **Tasks model without API/UI** — Prisma `Task` exists; no Nest module, no web tasks screens.
6. **Missing product surfaces** — Projects, notes, workspaces, meetings hub, Pilot Brief (web), command palette, insights charts (web), schedule sharing UI (web).
7. **OAuth tokens at rest** — `CalendarConnection.accessToken` / `refreshToken` stored as plaintext strings in Postgres.
8. **Web token storage** — JWT access/refresh in `localStorage` (XSS risk); no httpOnly cookie path.
9. **Mobile stack conflict** — Master plan requires Expo/RN iOS; repo investment is Flutter (including Android tooling).
10. **Supabase folder incomplete for plan** — No Edge Functions in active `supabase/` (only in archive); minimal `config.toml`; no seed aligned to new model.
11. **Marketing incomplete vs plan** — Missing Product/Integrations/Resources nav, FAQ, Terms/Privacy/Security pages, OG assets, dashboard preview matching new brand.
12. **CI gap** — No unit/E2E/RLS tests in PR workflow; Flutter CI separate; no Playwright.

---

## 4. Missing backend components (vs master plan §17–26)

| Domain | Status |
|--------|--------|
| Profiles (timezone, week_start, onboarding_status) | Partial (User first/last/avatar only in Prisma) |
| User preferences | Missing in Prisma; partial `preferences` in Supabase |
| Workspaces + members/roles | Missing (orgs/teams exist but different model) |
| Calendars as first-class entities | Supabase yes; Prisma uses CalendarConnection only |
| Events (recurrence, soft delete, attendees) | Partial |
| Tasks + subtasks | Model stub / Supabase table; no Nest CRUD |
| Projects, notes, focus sessions | Missing |
| Pilot briefs + usage limits | Missing (Flutter daily brief UI; legacy `generate-day`) |
| Booking pages / shared links | Supabase + Flutter; not Nest |
| Notifications table + device tokens | Missing in Prisma |
| Encrypted integration credentials | Missing |
| Entitlement service (central) | Billing tiers exist; no central entitlement layer |
| Shared typed API client + Zod | Missing |
| RLS automated tests | Missing |
| Seed data for new schema | Missing |

---

## 5. Missing tests

| Area | Current | Gap |
|------|---------|-----|
| Web unit / RTL | **None** | Components, hooks, auth, forms |
| Web E2E (Playwright) | **None** | Auth, events, tasks, Pilot Brief, sharing |
| API unit | Minimal (`app.controller.spec.ts`) | Auth, events, billing, calendar, AI, RLS-equivalent authz |
| API e2e | Stub `app.e2e-spec.ts` | Critical flows |
| Supabase RLS | **None** | Cross-user, workspace roles, expired links |
| Flutter | QA checklist incomplete; no automated Maestro/Detox in CI | |
| Visual regression | **None** | |
| Coverage gates | **None** | |

CI today: install, Prisma generate, build, lint only.

---

## 6. Proposed file changes (non-destructive first)

```
docs/architecture/REPOSITORY_AUDIT.md     # this file
docs/architecture/ADR-001-backend.md      # Nest vs Supabase SOT
docs/architecture/ADR-002-mobile.md       # Flutter vs Expo iOS
docs/progress/*                           # progress trackers
assets/brand/*                            # imported logo / OG / favicon set
apps/web/src/styles/tokens.css            # brand + semantic tokens
apps/web/src/components/ui/*              # design system
apps/web/src/components/shell/*           # sidebar + header
packages/validation/, packages/types/, packages/api-client/
supabase/migrations/*                    # evolve toward plan schema (if Supabase SOT)
# OR prisma/migrations/*                 # evolve Prisma (if Nest SOT)
apps/ios/                                 # Expo app (only if ADR-002 chooses RN)
```

**Do not delete** `daypilot_flutter/`, `apps/api/`, or `archive/` without an ADR and migration plan.

---

## 7. Proposed migration plan

### Decision gate (must resolve first)
1. **Backend SOT:** (A) Nest+Prisma primary + Supabase Auth only, (B) Supabase primary + Edge Functions, retire Nest gradually, (C) Keep Option C hybrid with explicit ownership matrix.
2. **Mobile:** (A) New Expo iOS app (plan default), (B) Rebrand/extend Flutter iOS-only for this milestone, (C) Flutter → RN port with feature parity checklist.

### Recommended default for this milestone (pending confirmation)
- **Keep Next.js** web (do not migrate to Vite).
- **Backend:** Prefer **Option C clarified**: Nest+Prisma remains SOT for events/tasks/billing/integrations; Supabase Auth for mobile (and optionally web later); add missing domains to Prisma first; port Pilot Brief as Nest endpoint or Edge Function with Nest auth — document in ADR-001.
- **Mobile:** Plan says Expo — **confirm before scaffolding `apps/ios`**. Preserve Flutter as reference/legacy until RN parity or explicit deprecation.
- **Rebrand first on web shell + tokens**, then screens, then backend schema gaps, then iOS.

### Phased execution (aligned to master plan)
0. Audit + progress + ADRs ← **current**  
1. Foundation (tokens, packages, CI test scripts, env validation)  
2. Rebrand assets + design system + marketing + app shell  
3. Backend core schema gaps + RLS or Nest authz tests  
4. Web core screens on real data  
5. Pilot Brief + Insights  
6. Sharing/booking  
7. Integrations hardening (encrypt tokens)  
8–9. iOS (Expo or Flutter per ADR)  
10–11. Testing + release  

---

## 8. Risks and blockers

| Risk | Severity | Notes |
|------|----------|-------|
| Flutter vs Expo decision | **Blocker** | Large Flutter codebase vs plan RN requirement |
| Dual DB SOT | **Blocker** | Schema drift; Pilot Brief/booking may hit wrong store |
| OAuth tokens plaintext | High | Must encrypt before production scale |
| JWT in localStorage | High | Prefer httpOnly cookies or hardened storage |
| No automated tests | High | Regressions during rebrand likely |
| New brand assets not in repo | Medium | PNGs provided in session; need SVG variants + clear-space rules |
| Android work in Flutter tree | Medium | Plan forbids Android optimization this phase — freeze Android deliverables |
| Stripe/Google/AI secrets | Medium | Manual dashboard setup still required |
| App Store / TestFlight | Medium | Depends on mobile stack choice + privacy/deletion flows |

---

## 9. First ten implementation tasks

1. Confirm ADR-001 (backend SOT) and ADR-002 (mobile stack) with product owner.
2. Create progress trackers under `docs/progress/`.
3. Import and organize brand assets into `assets/brand/` (+ iOS icon destinations).
4. Implement web design tokens (dark + electric green) and typography scale.
5. Build core UI primitives (Button, Input, Card, Badge, Avatar, Tabs) in web design system.
6. Rebuild authenticated app shell (sidebar + header + ⌘K placeholder) to match mockup.
7. Audit Prisma vs plan schema; draft migration(s) for tasks API + preferences (minimal).
8. Add Nest Tasks module + wire web Tasks MVP to real API.
9. Add Vitest + Playwright scaffolding and first auth/events smoke tests; extend CI.
10. Initialize or repair iOS app per ADR-002 (Expo scaffold **or** Flutter rebrand path); apply icon/splash.

---

## 10. Credentials / external setup (manual)

| Item | Where |
|------|--------|
| `DATABASE_URL` | Local Docker Postgres or hosted Postgres |
| `JWT_SECRET` | API (≥32 chars) |
| `NEXT_PUBLIC_API_URL` | Web |
| `SUPABASE_URL` (+ optional `SUPABASE_JWT_SECRET`) | API for mobile exchange; Flutter dart-defines |
| `SUPABASE_ANON_KEY` | Flutter / future web Supabase client |
| Stripe keys + webhook + price IDs | Billing |
| `GOOGLE_CLIENT_ID` / `SECRET` | Calendar connect |
| `MICROSOFT_CLIENT_ID` / `SECRET` | Outlook |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | AI / Pilot Brief |
| Sentry DSNs | Observability |
| Apple Developer + EAS / Xcode signing | iOS TestFlight |
| Domain DNS, privacy/terms URLs | Marketing + App Store |

Never commit service role keys, OAuth secrets, or AI keys. Root `.env.example` already lists variable names.

---

## Inventory notes

- **Web source files:** ~33 under `apps/web/src`
- **API TS modules:** ~51 under `apps/api/src`
- **Flutter Dart files:** ~61 under `daypilot_flutter/lib`
- **No Expo/RN app** under `apps/` today
- **Active brand:** Inter + cream `#f5e6d3` / teal `#4fb3b3` / gold `#efbf4d`
- **Target brand:** near-black surfaces + `#42E85F` / `#8CFF3F` logo gradient
