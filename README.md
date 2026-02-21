# DayPilot

**Pilot your day with AI.**

DayPilot is an AI-powered scheduling assistant that helps you manage your calendar across platforms. Connect your calendars, let AI plan your day, and pilot your schedule with confidence.

**Live site:** [daypilot.co](https://daypilot.co) (domain connected; deploys from `main`).

---

## Modern stack (in progress)

DayPilot is being rebuilt on a modern monorepo stack:

| Layer      | Technology                    |
|-----------|--------------------------------|
| Frontend  | Next.js (App Router), TypeScript, Tailwind |
| Backend   | NestJS, TypeScript, Prisma     |
| Database  | PostgreSQL + Prisma           |
| Auth      | JWT (access + refresh), roles |
| Billing   | Stripe                        |
| AI        | OpenAI                        |
| Real-time | WebSockets (NestJS Gateway)   |
| DevOps    | Docker, GitHub Actions, Vercel + backend deploy |

### Monorepo structure (Phase 2 ✓)

```
daypilot/
├── apps/
│   ├── web/          # Next.js frontend (Phase 3 ✓)
│   └── api/          # NestJS backend (Phase 4 ✓)
├── packages/
│   ├── ui/           # Shared components
│   └── lib/          # Shared utilities
├── prisma/           # Database schema (Phase 5 ✓)
├── docker/           # Dockerfiles & compose (Phase 10)
├── package.json      # Root scripts: pnpm dev, pnpm build, pnpm lint
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
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
pnpm db:migrate                   # Run migrations (requires Postgres; see .env.example)
```

**Database (prisma/):** PostgreSQL schema with User, Organization, Team, Event, Task, Subscription, AuditLog. **Setup:** [docs/SETUP_POSTGRES.md](./docs/SETUP_POSTGRES.md) — copy `.env.example` to `.env`, then `docker compose up -d` and `pnpm db:migrate`. API uses `PrismaService` (global).

**Frontend (apps/web):** Next.js 16, App Router, TypeScript, Tailwind, ESLint, `src/`. Core deps: axios, zustand, @tanstack/react-query, stripe, @supabase/supabase-js. Folders: `components`, `features`, `hooks`, `lib`, `providers`, `types`, `utils`.

**Backend (apps/api):** NestJS 11, TypeScript. Essentials: @nestjs/config, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, prisma, @prisma/client, class-validator, class-transformer, stripe.

Next: **Phase 6** — Authentication (JWT, refresh tokens, role guards, protected routes).

---

## License

See [LICENSE](./archive/legacy-v1/LICENSE) in the archive for license details.
