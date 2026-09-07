# DayPilot

**Pilot your day with AI.**

DayPilot gives you **one calendar with everything**: your own events, connected calendars (e.g. Google, Outlook), and events from shared booking links. One place to see and manage your schedule, with AI to help you plan it.

**Live site:** [daypilot.co](https://daypilot.co) (domain connected; deploys from `main`).

---

## Live stack (September 2026)

This is the running product, not the July 2026 Vite / Expo plan.

| Layer                 | Technology                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Web                   | Next.js 16 App Router, React 19, Tailwind 4 (`apps/web`) — [daypilot.co](https://daypilot.co) |
| Calendar / events API | NestJS 11 + Prisma Postgres (`apps/api`)                                                      |
| Auth + product tables | Supabase Auth (Google / Apple / Microsoft), RLS, Storage, `pilot-brief`                       |
| Mobile testers        | Flutter iOS (`daypilot_flutter/`)                                                             |
| Mobile target         | SwiftUI (`apps/ios/`) — do not delete Flutter until this has daily calendar + sync + auth     |
| Billing               | Stripe on Nest; App Store IAP on Flutter                                                      |
| AI                    | Nest schedule suggestions + Edge Function `pilot-brief`                                       |

Engineering notes: [docs/engineering/](./docs/engineering/). Agent rules: [CLAUDE.md](./CLAUDE.md).

### Monorepo structure

```
daypilot/
├── apps/web              # Next.js
├── apps/api              # NestJS
├── apps/ios              # SwiftUI rewrite
├── packages/lib          # Shared calendar types
├── packages/ui           # Stub
├── daypilot_flutter      # Tester iOS app
├── prisma                # Nest schema
├── supabase              # Auth / RLS / Edge Functions
├── archive/legacy-v1     # Old Vite + ASP.NET snapshot
├── docs/engineering      # Current audits
└── README.md
```

### Legacy code

The previous codebase (Vite + React, ASP.NET API, Supabase) is archived under:

- **Branch:** `legacy-daypilot-backup`
- **Tag:** `legacy-v1`
- **Folder:** [archive/legacy-v1](./archive/legacy-v1) (snapshot) and [archive/README.md](./archive/README.md) (why we reset, migration plan).

---

## Getting started

Prerequisites: Node.js 20+, pnpm.

```bash
pnpm install
pnpm dev                    # Run all apps (web: Next.js; api: placeholder)
pnpm build                  # Build all
pnpm lint                   # Lint all
pnpm dev --filter @daypilot/web   # Dev server for frontend only (port 3000)
pnpm db:generate                  # Generate Prisma client (after schema changes)
pnpm db:migrate                   # Run migrations in dev (requires Postgres; see .env.example)
pnpm db:migrate:deploy            # Apply migrations in production (non-interactive)
```

**Unified calendar:** Events are stored with a `source` (`native` \| `google` \| `outlook` \| `booking`). The app shows one calendar that will aggregate your events, connected calendars, and booking-link events in one place. Connected calendars and booking links are wired in later; the data model is ready.

**Database (prisma/):** PostgreSQL schema with User, Organization, Team, Event (with source + externalId), Task, Subscription, AuditLog. **Setup:** [docs/SETUP_POSTGRES.md](./docs/SETUP_POSTGRES.md) — copy `.env.example` to `.env`, then `docker compose up -d` and `pnpm db:migrate`. API uses `PrismaService` (global).

**Frontend (apps/web):** Next.js 16, App Router, TypeScript, Tailwind, ESLint, `src/`. Core deps: axios, zustand, @tanstack/react-query, stripe, @supabase/supabase-js. Folders: `components`, `features`, `hooks`, `lib`, `providers`, `types`, `utils`.

**Backend (apps/api):** NestJS 11, TypeScript. Essentials: @nestjs/config, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, prisma, @prisma/client, class-validator, class-transformer, stripe.

**DevOps (Phase 10):** CI (`.github/workflows/ci.yml`), API Docker build + push (`.github/workflows/deploy-api.yml` → GHCR), DB migration strategy (`db:migrate:deploy` in prod), staging + env/secrets — see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

---

## License

See [LICENSE](./archive/legacy-v1/LICENSE) in the archive for license details.
