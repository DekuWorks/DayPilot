# DayPilot Archive

This folder contains archived versions of the DayPilot codebase before major resets.

## legacy-v1

**Archived:** February 2025

### Why the architecture reset

The legacy stack was built with:

- **Frontend:** React + Vite + React Router (marketing + app in one)
- **Backend:** ASP.NET Core API + Supabase (auth, DB, Realtime)
- **Monorepo:** pnpm workspaces + Turborepo

We are resetting to adopt a clearer separation, modern tooling, and a stack that scales better for a SaaS product: dedicated Next.js frontend, NestJS backend, Prisma + PostgreSQL, and first-class Stripe billing, AI, and real-time support.

### Stack we're adopting

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend:** NestJS + TypeScript + Prisma
- **Database:** PostgreSQL + Prisma
- **Monorepo:** `apps/web`, `apps/api`, `packages/ui`, `packages/lib`
- **Auth:** JWT (access + refresh), role-based guards (USER, ADMIN, ORG_ADMIN)
- **Billing:** Stripe (Free, Personal, Business, Enterprise)
- **AI:** OpenAI integration (schedule optimization, week summary)
- **Real-time:** WebSockets (NestJS Gateway)
- **DevOps:** Docker, GitHub Actions, Vercel (frontend), AWS/Railway (backend)

### Migration plan

1. **Phase 1** — Archive & clean (this archive), create fresh monorepo structure.
2. **Phase 2** — Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/ui`, `packages/lib`, `prisma/`, `docker/`.
3. **Phase 3** — Frontend: Next.js, Tailwind, core deps (axios, zustand, react-query, Stripe).
4. **Phase 4** — Backend: NestJS, config, JWT, Passport, Prisma, class-validator, Stripe.
5. **Phase 5** — Database: Prisma schema (User, Organization, Team, Event, Task, Subscription, AuditLog).
6. **Phase 6** — Auth: JWT, refresh tokens, role guards, protected routes, token persistence.
7. **Phase 7** — Billing: Stripe customer on signup, webhooks, tiers, pricing/upgrade UI.
8. **Phase 8** — AI: OpenAI service, optimize-schedule, week-summary endpoints and UI.
9. **Phase 9** — Real-time: NestJS Gateway, calendar/team presence.
10. **Phase 10** — DevOps: Dockerfiles, docker-compose, CI/CD (Vercel + backend deploy).
11. **Phase 11** — Observability: logging, Sentry, audit logs, health check.
12. **Phase 12** — Production: rate limiting, CORS, validation, env schema, secure cookies, HTTPS.

### Restoring legacy code

The full state of the legacy codebase at archive time is preserved in:

- **Branch:** `legacy-daypilot-backup`
- **Tag:** `legacy-v1`

To restore or compare:

```bash
git checkout legacy-daypilot-backup
# or
git checkout legacy-v1
```

The contents of `archive/legacy-v1/` mirror the repository root at the time of archiving (excluding `.git`).
