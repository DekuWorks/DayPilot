# Known Issues

**Last updated:** 2026-09-15  
**Canonical debt register:** `docs/engineering/TECHNICAL_DEBT.md`

| ID | Severity | Issue | Area | Workaround | Status |
|----|----------|-------|------|------------|--------|
| KI-001 | Critical | Dual backend (Prisma Nest vs Supabase) can diverge event data | Backend | Option C; UI shows Nest vs Supabase read model | Open — intentional dual DBs |
| KI-002 | Critical | Master plan required Expo iOS; repo is Flutter + SwiftUI | iOS | Flutter keep-alive; SwiftUI is target (ADR-004) | Accepted — do not scaffold Expo |
| KI-003 | High | Calendar OAuth tokens plaintext in DB | Security | Set `CALENDAR_TOKEN_ENCRYPTION_KEY`; legacy rows plaintext until rewrite | Partially fixed — encrypt on write when key set |
| KI-004 | High | Web JWTs in localStorage | Security | — | Fixed — memory + httpOnly cookies |
| KI-005 | High | No web automated tests | Quality | — | Partially fixed — `apps/web` `*.spec.ts` in CI; no Playwright |
| KI-006 | Medium | Shared packages empty | Architecture | `@daypilot/lib` has calendar helpers; `@daypilot/ui` still stub | Partially fixed |
| KI-007 | Medium | Brand is cream/teal; approved identity is dark+green | Brand | — | Open — product/design |
| KI-008 | Medium | Prisma Task model with no API/UI | Product | Use Supabase tasks | Open — deferred schema cleanup |
| KI-009 | Medium | Flutter Android present; milestone forbids Android work | Process | Do not expand Android | Accepted |
| KI-010 | Low | Marketing missing legal/FAQ/OG assets | Web | Privacy page exists | Open |
| KI-011 | High | Auth emails used Site URL `localhost:3000` | Auth | Set Site URL to `https://www.daypilot.co` + allow list | Fixed 2026-07-21 |
| KI-012 | Medium | Nest listEvents falls back to Supabase on Nest errors | Web | Logged + `getEventListFallbackReason` | Deferred — resilience vs honesty |
| KI-013 | Medium | Nest Event has no `meetingUrl` | API | Field kept on Supabase path only | Deferred — schema change |
