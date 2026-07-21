# Known Issues

**Last updated:** 2026-07-21

| ID | Severity | Issue | Area | Workaround | Status |
|----|----------|-------|------|------------|--------|
| KI-001 | Critical | Dual backend (Prisma Nest vs Supabase) can diverge event data | Backend | Option C docs; pick SOT | Open — ADR-001 |
| KI-002 | Critical | Master plan requires Expo iOS; repo is Flutter | iOS | Decision pending | Open — ADR-002 |
| KI-003 | High | Calendar OAuth tokens stored plaintext in DB | Security | Restrict DB access | Open |
| KI-004 | High | Web JWTs in localStorage | Security | XSS hardening; prefer cookies later | Open |
| KI-005 | High | No web automated tests | Quality | Manual QA | Open |
| KI-006 | Medium | Shared packages empty | Architecture | Import from apps directly | Open |
| KI-007 | Medium | Brand is cream/teal; approved identity is dark+green | Brand | — | Open |
| KI-008 | Medium | Prisma Task model with no API/UI | Product | — | Open |
| KI-009 | Medium | Flutter Android present; milestone forbids Android work | Process | Do not expand Android | Accepted |
| KI-010 | Low | Marketing missing legal/FAQ/OG assets | Web | — | Open |
