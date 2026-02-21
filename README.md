# DayPilot

**Pilot your day with AI.**

DayPilot is an AI-powered scheduling assistant that helps you manage your calendar across platforms. Connect your calendars, let AI plan your day, and pilot your schedule with confidence.

Visit [daypilot.co](https://daypilot.co) to learn more.

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

### Target monorepo structure

```
daypilot/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── ui/           # Shared components
│   └── lib/          # Shared utilities
├── prisma/           # Database schema
├── docker/
└── README.md
```

### Legacy code

The previous codebase (Vite + React, ASP.NET API, Supabase) is archived under:

- **Branch:** `legacy-daypilot-backup`
- **Tag:** `legacy-v1`
- **Folder:** [archive/legacy-v1](./archive/legacy-v1) (snapshot) and [archive/README.md](./archive/README.md) (why we reset, migration plan).

---

## Getting started (once Phase 2+ is in place)

Prerequisites: Node.js 20+, pnpm, Docker (optional).

```bash
pnpm install
pnpm dev
```

Details will be added as the new structure is created.

---

## License

See [LICENSE](./archive/legacy-v1/LICENSE) in the archive for license details.
