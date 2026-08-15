# Architecture Decisions

**Last updated:** 2026-08-15

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

**Status:** Superseded  
**Date:** 2026-07-21  
**Superseded by:** ADR-004 (2026-08-15)  
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

### Superseded because
TestFlight 12 is live on Flutter, but the iOS target is now SwiftUI (`apps/ios`, bundle `com.dekuworks.daypilot.swift` until ASC takeover). Flutter stays installed for testers; it is not the place for new features. See ADR-004 and `docs/daypilot-architecture-audit.md`.

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

---

## ADR-004 — SwiftUI is the iOS target; Flutter is maintenance

**Status:** Accepted  
**Date:** 2026-08-15  
**Decided by:** Product owner  
**Supersedes:** ADR-002

### Context
Testers are on Flutter TestFlight 1.0.0 (12), bundle `com.dekuworks.daypilot`. Outlook, EventKit ingest, and JWT exchange still run on Nest. A full Flutter rewrite of those contracts would be thrown away. ADR-001’s “Nest is legacy” line is also wrong for this slice — do not move Graph/EventKit to Edge Functions in 90 days.

### Decision
- **SwiftUI** (`apps/ios/`, iOS 17+, Clean Architecture) is the iOS product target.
- Until it can take over App Store Connect, use bundle `com.dekuworks.daypilot.swift` so TestFlight 12 stays installable.
- **Flutter** remains the tester daily driver. Maintenance only: crash, sync, auth, TestFlight keep-alive. No new Flutter features after the shared-core list (avatar, Graph, EventKit ingest, `api.daypilot.co` TLS).
- **Do not delete Flutter** until SwiftUI can do daily calendar + sync + auth.
- **Do not rewrite Next.js** (ADR-003 still stands).
- SwiftUI views must not call Graph, EventKit, or Supabase. Repositories only. No Google/Microsoft client secrets in the iOS bundle.

### Consequences
- Two iOS codebases until parity.
- Shared work is Nest + Supabase contracts, not a second OAuth or a second event schema.
- See `docs/daypilot-architecture-audit.md` and `docs/feature-parity.md`.
