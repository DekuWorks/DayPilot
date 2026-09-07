# Project

## Purpose

DayPilot is an AI-assisted calendar product. Live web is [daypilot.co](https://daypilot.co). Testers use Flutter iOS; SwiftUI is the next iOS target. Do not treat the July 2026 “Vite + Expo” master plan as the running stack.

## Architecture

Two production data planes:

1. **NestJS + Prisma Postgres** — events, calendar connections, Google/Outlook OAuth, EventKit ingest, Nest JWT.
2. **Supabase** — Auth (SSO), profiles, tasks, booking, friends, Pilot Brief rows, Storage.

Clients sign in with Supabase, then `POST /auth/supabase-exchange` for a Nest JWT used by events and calendar routes.

## Technology Stack

- Web: Next.js 16 App Router, React 19, Tailwind 4 (`apps/web`)
- API: NestJS 11, Prisma 5 (`apps/api`)
- Mobile testers: Flutter (`daypilot_flutter/`)
- Mobile target: SwiftUI (`apps/ios/`)
- Auth: Supabase Auth (Google / Apple / Microsoft) + Nest JWT bridge
- Calendars: Google Calendar API, Microsoft Graph, Apple EventKit (CalDAV dormant)
- AI: Nest schedule suggestions + Edge Function `pilot-brief`
- Package manager: pnpm 9 + Turborepo

## Repository Structure

```text
apps/web              Next.js
apps/api              NestJS
apps/ios              SwiftUI rewrite
packages/lib          Shared calendar types / adapter interface
packages/ui           Stub
daypilot_flutter      Tester iOS app
prisma                Nest schema
supabase              Auth/RLS/Edge Functions
archive/legacy-v1     Old Vite + ASP.NET snapshot
docs/engineering      Current audits (this effort)
```

## Development Rules

- Read this file and `docs/daypilot-architecture-audit.md` before large changes.
- Do not work on `main`. Use `audit/*`, `fix/*`, `feature/*`, `refactor/*`, `test/*`.
- Do not delete Flutter until SwiftUI can do daily calendar + sync + auth.
- Do not rewrite Next.js to Vite. Do not scaffold Expo.
- Do not move Graph / EventKit / JWT exchange to Edge Functions in the current slice.
- SwiftUI views must not call Graph, EventKit, or Supabase directly.

## Frontend Rules

- Unlock UI from the Supabase session; enrich Nest JWT in the background (`AuthProvider`).
- Never await network inside `onAuthStateChange`.
- Apple Calendar on web is EventKit ingest, not Sign in with Apple.

## Backend Rules

- Calendar OAuth client secrets stay on Nest.
- Do not log access tokens, refresh tokens, or app-specific passwords.

## Database Rules

- Do not run destructive migrations against production.
- Prisma and Supabase schemas both exist; do not assume one store has all rows.

## API Rules

- Events and calendar-connections require Nest JWT.
- Profiles/tasks/booking/friends use Supabase RLS with the user session.

## Security Rules

- Never commit `.env`, `dart-define.json`, `.p8` keys, or service-role keys.
- Never put the Supabase service role in a client bundle.
- Calendar tokens in Prisma are encrypted when `CALENDAR_TOKEN_ENCRYPTION_KEY` is set (AES-256-GCM, `enc:v1:` prefix). Legacy plaintext is still readable. Do not echo tokens to clients or logs.

## Testing Rules

- API: `pnpm --filter @daypilot/api test`
- Flutter: `flutter test` in `daypilot_flutter/`
- Web has no unit-test script. Do not invent a pass.
- If validation fails, fix or document. Do not skip tests.

## Git Workflow

```text
main
 └── audit|fix|feature|refactor|test/<name>
       └── pull request (human merge)
```

## Commands

```bash
pnpm lint
pnpm --filter @daypilot/api test
pnpm --filter @daypilot/api exec prettier --check "src/**/*.ts"
pnpm --filter @daypilot/api run build
pnpm --filter @daypilot/web run build
pnpm --filter @daypilot/web run lint
# Flutter (from daypilot_flutter/)
flutter analyze
flutter test
```

There is no root `typecheck` or `test` script.

## Environment Variables

See `.env.example`. Never copy production values into this file.

## Deployment

- Web: GitHub Pages from `main` (see `.github/workflows/deploy-pages.yml`)
- API: Railway / GHCR (see `docs/DEPLOYMENT.md`)
- Do not modify production databases from this agent.

## AI Agent Rules

1. Discover first (this file, existing `docs/`, git status).
2. Work on a feature/audit/fix branch.
3. Run the commands that exist.
4. Do not merge PRs unless asked.
