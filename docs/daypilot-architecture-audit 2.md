# DayPilot architecture audit (live stack)

**Date:** 2026-08-15  
**Scope:** What is actually running for testers today — not the 2026-07-21 Phase 0 stub in `docs/architecture/REPOSITORY_AUDIT.md`.  
**Status:** Current. Supersedes the “Nest is legacy / Flutter-only milestone” reading of ADR-001 and ADR-002 for the next 90 days. See `docs/progress/DECISIONS.md`.

**Confidence:** high on topology and contracts; medium on `api.daypilot.co` TLS cutover timing.

---

## 1. What is live

| Surface | Stack | Where |
|---------|--------|--------|
| Web | Next.js App Router (`apps/web`) | [www.daypilot.co](https://www.daypilot.co) via GitHub Pages |
| iOS (testers) | Flutter `daypilot_flutter/` | TestFlight **1.0.0 (12)**, bundle `com.dekuworks.daypilot` |
| iOS (rewrite) | SwiftUI `apps/ios/` | Bundle `com.dekuworks.daypilot.swift` until it can take over ASC |
| Auth | Supabase Auth (Google / Apple / Microsoft SSO) | Project `wmkytyrcxbzjqiykbauw` |
| Calendar / events API | NestJS + Prisma Postgres | Railway `https://api-production-6c2c.up.railway.app` |
| Profiles, tasks, booking, orgs, friends, Pilot Brief rows | Supabase Postgres + RLS + Storage | `supabase/migrations`, bucket `avatars` |
| Shared calendar types | TypeScript | `packages/lib/src/calendar/types.ts` |

`GET https://api.daypilot.co/health` is **not** the production URL until it returns 200. Pages and Flutter stay on the Railway origin until then. Nest already probes first-party TLS before using `api.daypilot.co` as an OAuth callback (`firstPartyApiHostReady()`).

---

## 2. Runtime topology

```
Next.js web  ──┐
Flutter iOS  ──┼── Supabase Auth / Storage / RLS (profiles, tasks, booking, pilot_briefs)
SwiftUI iOS  ──┘
               └── POST /auth/supabase-exchange ──► Nest JWT
                                                   ├── GET/PATCH /events
                                                   ├── GET /calendar-connections
                                                   ├── Google + Outlook OAuth + Graph
                                                   └── POST /calendar-connections/apple/eventkit/sync
```

Two databases are in production, not a migration leftover:

1. **Prisma / Nest Postgres** — `Event`, `CalendarConnection`, synced calendar rows, Nest users/JWT.
2. **Supabase Postgres** — `profiles` (including `avatar_url`), tasks, booking links, orgs, friends, `pilot_briefs`.

Clients must keep using both. Moving Outlook OAuth, Graph, EventKit ingest, and JWT exchange to Edge Functions is **out of the 90-day slice**.

---

## 3. Auth contract

1. User signs in with Supabase (email or SSO).
2. Client sends the Supabase access token to `POST /auth/supabase-exchange`.
3. Nest returns its own JWT. Events and calendar-connection routes use that JWT (`JwtAuthGuard`).
4. Google / Microsoft **client secrets stay on Nest**. No provider secrets in any iOS bundle.

SSO photos: persist into `profiles.avatar_url` (bucket `avatars` is live). Clients read that column first, then SSO metadata.

---

## 4. Calendar contract

| Provider | How it gets into Nest | Who can show it |
|----------|----------------------|-----------------|
| Google | Nest OAuth + Calendar API sync | Web, Flutter, SwiftUI via `GET /events` |
| Outlook | Nest OAuth + Microsoft Graph `calendarView` | Same |
| Apple | Device EventKit → `POST /calendar-connections/apple/eventkit/sync` | Web (cloud copy); iOS also reads EventKit locally |

EventKit ingest is the **Apple cloud copy** so web can see iPhone events. SwiftUI talks to EventKit natively and still pushes the same DTO (`EventKitSyncDto`: `deviceId`, calendars, events, `syncStartedAt`, chunked uploads).

Outlook Graph must call `https://graph.microsoft.com` as `baseUrl` with `defaultVersion: 'v1.0'`. Passing `/v1.0` in both produced `/v1.0/v1.0` and `Resource not found for the segment 'v1.0'`.

---

## 5. Pilot Brief

Web (`apps/web/src/app/(app)/pilot-brief/page.tsx`) reads `pilot_briefs` for today and can regenerate via `POST {SUPABASE_URL}/functions/v1/pilot-brief`.

The 90-day SwiftUI bar is **read** of that same row. Do not rebuild the AI router.

---

## 6. What the old ADRs got wrong

| ADR | 2026-07-21 claim | Live 2026-08-15 |
|-----|------------------|-----------------|
| ADR-001 | Nest is legacy; no new Nest features | Outlook, Graph, EventKit ingest, and JWT exchange **run on Nest** |
| ADR-002 | Flutter for this milestone; do not scaffold `apps/ios` | Flutter is TestFlight maintenance; SwiftUI is the iOS target |
| ADR-003 | Keep Next.js | Still correct — do not migrate to Vite |
| Repo audit stub | `packages/lib` empty; web auth is Nest JWT in localStorage | Shared calendar types exist; web uses Supabase Auth + Nest exchange |

---

## 7. Hard rules for the next 90 days

- Do not delete Flutter until SwiftUI can do daily calendar + sync + auth.
- Flutter: crash / sync / auth / TestFlight keep-alive only. No new features.
- Do not rewrite Next.js.
- Do not rip out Nest.
- Do not start enterprise SSO, admin console, MCP, Foundation Models, WidgetKit, Live Activities, or App Intents.
- SwiftUI views must not call Graph, EventKit, or Supabase. Repositories only.

---

## 8. Sources

- Live web routes under `apps/web/src/app/(app)/`
- Flutter router `daypilot_flutter/lib/core/routing/app_router.dart`
- Nest calendar module `apps/api/src/calendar-connections/`
- Shared types `packages/lib/src/calendar/types.ts`
- Stale Phase 0 write-up `docs/architecture/REPOSITORY_AUDIT.md` (2026-07-21)
