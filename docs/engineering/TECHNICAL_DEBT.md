# DayPilot technical debt register

**Last updated:** 15 September 2026  
**Branch / PR context:** `cursor/tech-debt-cleanup-5f5a`  
**Sources:** live tree + `docs/engineering/*` + `docs/daypilot-architecture-audit.md` (claims re-verified; stale audit rows called out below).

This register is the honest inventory after a debt paydown pass. Prefer this file over July 2026 progress sheets when they conflict.

---

## Fixed in this pass

| Area | Change |
|------|--------|
| API CORS | Production no longer fails open when `CORS_ORIGIN` is unset; shared allowlist helper + unit tests |
| WebSocket CORS / JWT | Socket.IO uses the same origin policy; JWT secret resolved without a production placeholder fallback; removed `any` on the gateway path |
| Nest cookie auth | All Nest web clients use `nestFetch` (`credentials: "include"` + Bearer) so httpOnly cookies work alongside memory JWTs |
| Realtime socket | `useEventsSocket` resubscribes when Nest session appears/rotates |
| Env / ops docs | `.env.example` documents `CALENDAR_TOKEN_ENCRYPTION_KEY`, drops duplicate `FRONTEND_URL`, notes `com.dekuworks` Apple IDs |
| Env schema | Production requires `CORS_ORIGIN`; warns when calendar token encryption key is missing |
| Package lint honesty | `@daypilot/lib` and `@daypilot/ui` run `tsc --noEmit` instead of echo stubs |
| Dead web deps | Removed unused `axios`, `@tanstack/react-query`, `stripe` from `apps/web` |
| Dead code | Removed unused `ComingSoon` component |
| Duplicates | Shared `formatWhen`, `formatDuration`, `APPLE_CALENDAR_DEEP_LINK` |
| Privacy copy | Apple calendar described as EventKit ingest (not live CalDAV product path) |
| Events UX | Nest list failures log a fallback reason (`getEventListFallbackReason`) instead of silent catch |
| CI | Prettier `--check` for API sources; `@types/bcrypt` moved to API `devDependencies` |
| Docs | This register; refreshed `KNOWN_ISSUES.md`, `TESTING_PROGRESS.md`, `validation-baseline.md` |

### Already fixed before this pass (audits were stale)

- Nest JWT off `localStorage` (memory + httpOnly cookies)
- Pilot Brief Edge Function CORS allowlist (not `*`)
- Calendar token AES-GCM when `CALENDAR_TOKEN_ENCRYPTION_KEY` is set
- Flutter Nest JWT in Keychain; SwiftUI `KeychainSessionStore`
- Main CI runs API Jest + web `*.spec.ts`
- `packages/lib` calendar types / normalize / dedupe (not empty)

---

## Remaining — intentional (do not “clean up” without a product decision)

| Item | Why left |
|------|----------|
| Dual Prisma + Supabase databases | Live production topology; collapsing them is a migration programme, not hygiene |
| Flutter kept alongside SwiftUI | Testers still on Flutter until SwiftUI reaches calendar + sync + auth parity (ADR-004) |
| Empty `@daypilot/ui` package | Stub reserved for shared UI; no consumers yet |
| Dormant iCloud CalDAV module | Code + tests remain for experiments; product path is EventKit |
| No Playwright/Cypress / no automated RLS suite | Product-sized test investment |
| No Google/Graph dedicated backoff module | Providers still sync; backoff is deferred hardening |
| Nest `meetingUrl` absent | Prisma `Event` has no column; Supabase path still stores meeting URLs — schema change deferred |
| Android product expansion frozen | Toolchain may exist; do not expand scope |
| Root + API both depend on `@prisma/client` | Historical monorepo layout; changing it risks generate/deploy scripts |
| `@daypilot/lib` tsconfig keeps `outDir: dist` + CommonJS emit | `apps/api/Dockerfile` compiles the package then rewrites `package.json` to `./dist/index.js`. Dropping `outDir` / setting emit-off-only configs breaks the production API image (`Cannot find module '@daypilot/lib'`). Lint still uses `tsc --noEmit`. |

---

## Remaining — deferred (actionable later)

| Item | Severity | Why deferred |
|------|----------|--------------|
| Legacy plaintext calendar tokens until rewrite | High (ops) | Needs production `CALENDAR_TOKEN_ENCRYPTION_KEY` + reconnect/rewrite wave |
| Nest → Supabase silent list fallback | Medium | Still falls back so calendar UI loads; now logged + queryable. Hard-fail would break offline Nest |
| Flutter / SwiftUI tests not in main `ci.yml` | Medium | Covered by path-filtered Flutter workflow; unifying is CI product work |
| Nest e2e (`test:e2e`) unused | Low | Hello-world smoke only; real e2e needs auth fixtures |
| `api.daypilot.co` TLS cutover | Medium (ops) | Railway origin still canonical until health returns 200 |
| Email-only Nest users needing link UI | Medium | Merge-duplicate exists; broader identity UI is product |
| Stale July audit bodies still readable | Low | Header banners mark historical; rewrite-all would churn without changing runtime |
| React Query unused after dep removal | Low | Perf audit still recommends adopting it for calendar fetches |
| Prisma `Task` model with no Nest routes | Low | Live tasks are Supabase; leave schema until a deliberate cleanup migration |

---

## Out of scope (explicit)

- Deleting Flutter
- Rewriting Next.js to Vite / scaffolding Expo
- Ripping out Nest or moving Graph / EventKit / JWT exchange to Edge Functions
- Enterprise SSO, admin console, MCP, WidgetKit, Live Activities, App Intents
- Destructive production database migrations

---

## Validation commands

```bash
pnpm --filter @daypilot/api test
pnpm --filter @daypilot/web test
pnpm --filter @daypilot/api exec prettier --check "src/**/*.ts"
pnpm lint
pnpm --filter @daypilot/api run build
pnpm --filter @daypilot/web run build
```
