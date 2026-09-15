# Testing Progress

**Last updated:** 2026-09-15  
See also `docs/engineering/TECHNICAL_DEBT.md` and `docs/engineering/validation-baseline.md`.

| Feature | Status | Owner | Related files | Tests | Notes | Next action |
|---------|--------|-------|---------------|-------|-------|-------------|
| Web Node test runner | [x] | — | `apps/web/src/lib/*.spec.ts` | connection UI + nest-session | `pnpm --filter @daypilot/web test` in main CI | Expand auth/timezone coverage |
| Web Playwright | [ ] | — | — | 0 | No E2E harness | Smoke auth/events when ready |
| API Jest | [x] | — | `apps/api/src/**/*.spec.ts` | Graph, OAuth, EventKit, token crypto, CORS, JWT helpers | Main CI | Keep adding critical-path specs |
| API e2e | [~] | — | `apps/api/test/app.e2e-spec.ts` | stub | `test:e2e` not in CI | Real auth/health e2e or delete stub |
| RLS tests | [ ] | — | — | 0 | Dual-DB world | Cross-user denial suite |
| Flutter unit tests | [x] | — | `daypilot_flutter/test/` | ~15 | `flutter_mobile_ci.yml` path filter | Optionally mirror on main CI |
| SwiftUI unit tests | [~] | — | `apps/ios/Tests/` | present | No CI job | Wire when SwiftUI is primary |
| CI quality gates | [x] | — | `.github/workflows/ci.yml` | API + web tests, prettier check, build, lint | — | Keep honest (no stub lint) |
| Coverage targets | [ ] | — | — | — | No enforced % gate | Configure when useful |
