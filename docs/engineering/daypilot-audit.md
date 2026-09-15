# DayPilot repository audit

**Date:** 7 September 2026  
**Branch:** `audit/engineering-baseline`  
**Confidence:** high on topology and commands; medium on live Railway/TLS timing.  
**Sources:** repository files only. `.env` was not read.

This audit describes what is in the tree today. It does not follow the prompt’s Vite / React 18 / Expo assumptions.

---

## Architecture map

```text
Next.js web (apps/web)
   ├── Supabase Auth / RLS / Storage / Edge Function pilot-brief
   └── Nest JWT via POST /auth/supabase-exchange
         ├── events, billing, AI suggestions
         └── calendar-connections (Google, Outlook, EventKit ingest)

Flutter iOS (daypilot_flutter)     testers, TestFlight
SwiftUI iOS (apps/ios)             rewrite target
   ├── Supabase Auth
   ├── EventKit on device
   └── Nest (exchange + events + EventKit sync)

Prisma Postgres                    events + CalendarConnection + Nest users
Supabase Postgres                  profiles, tasks, booking, friends, pilot_briefs
```

Shared TypeScript types live in `packages/lib/src/calendar/types.ts`. `@daypilot/ui` is still a stub.

---

## Surfaces

| Surface | Path                | Role                                                              |
| ------- | ------------------- | ----------------------------------------------------------------- |
| Web     | `apps/web`          | Marketing + authenticated app. Next.js 16, React 19, Tailwind 4   |
| API     | `apps/api`          | NestJS 11. Source of calendar OAuth and synced events             |
| Flutter | `daypilot_flutter/` | Tester daily driver. Maintenance only (ADR-004)                   |
| SwiftUI | `apps/ios/`         | Product iOS target. Repositories only for Graph/EventKit/Supabase |
| Legacy  | `archive/legacy-v1` | Old Vite + ASP.NET + Edge Functions. Reference only               |

There is **no** React Native / Expo app.

---

## Major dependencies

| Area | Packages                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| Web  | `next@16.1.6`, `react@19.2.3`, `@supabase/ssr`, `@tanstack/react-query`, `zustand`, `axios`, `socket.io-client`                   |
| API  | `@nestjs/*@11`, `prisma@5.22`, `googleapis`, `@microsoft/microsoft-graph-client`, `jose`, `openai`, `@anthropic-ai/sdk`, `stripe` |
| Root | `pnpm@9.14.2`, `turbo@2.3`, Node `>=20` (CI uses 20)                                                                              |

---

## Technical debt

Handled on `fix/critical-audit-remediation` (this pass):

- Calendar tokens encrypted at rest when `CALENDAR_TOKEN_ENCRYPTION_KEY` is set.
- Web Nest JWTs off `localStorage` (memory + httpOnly cookies).
- Nest users linked by Supabase `sub` (`users.supabase_user_id`).
- Flutter Nest JWTs in Keychain; SwiftUI `KeychainSessionStore`.
- Google/Outlook import writes `allDay` + `timezone`.
- Apple SSO lands on `/sync?apple=sso` with an EventKit banner.
- Calendar UI states when it is reading Supabase instead of Nest.
- Pilot Brief CORS is origin-allowlisted.
- Main CI runs API Jest + web `*.spec.ts`.
- README and `docs/architecture/REPOSITORY_AUDIT.md` point at the live stack.

Left on purpose (destabilising or product-sized):

1. Dual production databases (Prisma events vs Supabase product tables).
2. Empty `@daypilot/ui`; `@daypilot/lib` / `@daypilot/ui` lint via `tsc --noEmit`.
3. Two iOS codebases until SwiftUI reaches parity (do not delete Flutter).
4. iCloud CalDAV dormant; no live ICS subscription provider.
5. No Playwright/Cypress; no automated RLS tests.
6. No explicit Google/Graph backoff module.
7. Hide My Email vs Gmail: Settings → “Link a second sign-in” plus `POST /auth/merge-duplicate` (both Supabase JWTs required). Google/Outlook `singleEvents` / `calendarView` still expand instances; RRULE is stored when the provider sends it.

Live register: `docs/engineering/TECHNICAL_DEBT.md`.

---

## Security risks

| Severity | Finding                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------- |
| HIGH     | Prisma tokens: encrypt when `CALENDAR_TOKEN_ENCRYPTION_KEY` is set; leftover plaintext until next write |
| HIGH     | Web Nest JWTs: memory + httpOnly cookies (Bearer + `credentials: include` on Nest fetches)              |
| HIGH     | Nest user stores `supabase_user_id`; email-only leftovers still need a link UI                          |
| MEDIUM   | Flutter Nest JWTs: Keychain via secure storage (migrates old prefs once)                                |
| MEDIUM   | Dual auth identity (Supabase UUID vs Nest cuid) linked by `supabase_user_id` (+ merge-duplicate)        |
| MEDIUM   | Pilot Brief Edge Function CORS is origin-allowlisted (`supabase/functions/pilot-brief/index.ts`)        |
| LOW      | `.env` exists locally and is gitignored — do not commit                                                 |

Production API requires `CORS_ORIGIN` and a non-placeholder `JWT_SECRET`. See `docs/engineering/TECHNICAL_DEBT.md`.

No client-side service-role key was found in application source. `.env.example` documents anon + Nest secrets only.

---

## Performance concerns

- Auth enrich is backgrounded (good). Google SSO auto-connect can hard-redirect to OAuth (`maybeAutoConnectCalendars`).
- Calendar views are custom day/week/month components — no virtualization library found.
- Flutter and SwiftUI both present; shipping both increases QA cost.
- EventKit uploads were previously 413-limited; chunking exists (`fix/eventkit-413-and-session`).

---

## Testing gaps

| Area    | What exists                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| API     | Jest specs for Graph client, OAuth callback, EventKit reconcile/dedupe, CalDAV password shape, health controller |
| Web     | New `calendar-connection-ui.spec.ts` on this branch; no package.json `test` script                               |
| Flutter | ~15 Dart tests including `calendar_connection_ui_test.dart`; Flutter CI runs them. Main `ci.yml` does not        |
| SwiftUI | `apps/ios/Tests/DayPilotCoreTests`                                                                               |
| E2E     | No Playwright/Cypress in the live tree                                                                           |
| RLS     | No automated policy tests                                                                                        |

---

## Validation commands that exist

| Step       | Command                                  | Notes                                                               |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Format     | `pnpm --filter @daypilot/api run format` | API only (Prettier)                                                 |
| Lint       | `pnpm lint` (turbo)                      | `@daypilot/lib` prints a stub                                       |
| Typecheck  | none named                               | `next build` / `nest build` typecheck as they compile               |
| Unit tests | `pnpm --filter @daypilot/api test`       | API only                                                            |
| Web build  | `pnpm --filter @daypilot/web run build`  |                                                                     |
| Mobile     | `flutter analyze` / `flutter test`       | Flutter CI; Android build exists but Android product work is frozen |

---

## Top 10 engineering priorities

1. Keep Identity Authentication separate from Calendar Authorization in every UI (Apple SSO ≠ EventKit).
2. Encrypt or vault calendar tokens at rest.
3. Move web Nest tokens off `localStorage`.
4. Honest EventKit status when iOS permission is denied or stale.
5. One event read model for web/iOS so Prisma/Supabase split is explicit in the UI.
6. Web unit tests for auth mapping, connection UI, and timezone helpers.
7. Add API tests to CI (currently build+lint only).
8. Finish `api.daypilot.co` TLS cutover or stop advertising it as live.
9. SwiftUI parity for calendar + sync + auth so Flutter can be retired.
10. Stop writing new features on Flutter (ADR-004).

---

## Git state at audit

- Default remote branch: `origin/main`
- Working branch for this write-up: `audit/engineering-baseline`
- Existing fix branches already landed conceptually: EventKit 413, null availability, Graph `/v1.0/v1.0`, connection status UI
