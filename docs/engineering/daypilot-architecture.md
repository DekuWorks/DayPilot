# DayPilot architecture (actual)

**Date:** 7 September 2026  
**Confidence:** high

```text
Web App (Next.js)
   ↓
Shared services (thin): @daypilot/lib types, per-app API clients
   ↓
Auth / Calendar / Scheduling / AI
   ↓
Supabase (Auth, RLS product tables, Storage, Edge Function pilot-brief)
   +
NestJS (JWT, events, OAuth, Graph, EventKit ingest, billing, AI suggest)
   ↓
Prisma Postgres                          Supabase Postgres

Mobile testers (Flutter)
   ↓
Supabase Auth + EventKit + Nest adapters

Mobile target (SwiftUI)
   ↓
Repositories only → Nest + EventKit + Supabase
```

This is **not** Vite → shared RN services → Supabase-only.

---

## Frontend architecture

`apps/web` uses the App Router:

- Public: `/`, login, signup, privacy, `auth/callback`
- Authenticated `(app)`: home, calendar, sync, integrations, settings, billing, tasks, notes, focus, meetings, friends, booking-links, pilot-brief
- Providers: `AuthProvider`, `ThemeProvider`, React Query
- Calendar UI: `WeekCalendarView`, `DayTimeline`, `EventModals`, `HomeDashboard`
- Auth unlocks from Supabase session; Nest exchange is enrichment (`AuthProvider.tsx`)

`packages/lib` exports `CalendarProviderAdapter` and normalized event types. Nest and Flutter do **not** yet implement that interface as concrete classes. Google/Outlook/Apple logic lives in Nest services.

---

## Mobile architecture

| Client  | Bundle (docs)                  | Allowed to call                                       |
| ------- | ------------------------------ | ----------------------------------------------------- |
| Flutter | `com.dekuworks.daypilot`       | Supabase, Nest, EventKit (maintenance)                |
| SwiftUI | `com.dekuworks.daypilot.swift` | Repositories wrapping Nest + EventKit + session store |

SwiftUI: `DayPilotCore` (`NestAPIClient`, `EventKitPayloadMapper`), app features under `apps/ios/App/DayPilot/Features/`.

ADR-004: no new Flutter features; do not delete Flutter until SwiftUI covers daily calendar + sync + auth.

---

## Auth flow

```text
User → Supabase Auth (email, Google, Apple, Microsoft)
     → web/iOS session
     → POST /auth/supabase-exchange (Supabase access token)
     → Nest JWT (localStorage on web; in-memory/session store on iOS)
     → JwtAuthGuard on /events and /calendar-connections
```

Identity providers do **not** grant calendar scopes by themselves.

Google/Microsoft SSO may _trigger_ a second calendar OAuth via `maybeAutoConnectCalendars`. Apple SSO never does.

---

## Calendar connection flow

```text
Connect Provider
      ↓
Authorization
  Google/Outlook: Nest OAuth (secrets on server)
  Apple: EventKit permission on device (CalDAV ASP dormant)
      ↓
Token / Native Permission
      ↓
Calendar Discovery
      ↓
Event Fetch (Google Calendar API, Graph calendarView, EventKit payload)
      ↓
Normalization (source + externalId on Prisma Event)
      ↓
DayPilot DB (Prisma)
      ↓
Unified calendar via GET /events
```

Apple web visibility depends on iOS posting `POST /calendar-connections/apple/eventkit/sync`.

---

## Event synchronization flow

1. OAuth providers: `syncConnection` in `calendar-connections.service.ts`
2. EventKit: `eventkit-sync.service.ts` (chunked, deduped against Google/Microsoft device calendars)
3. Clients poll or use the Socket.IO events gateway
4. Duplicates: `packages/lib` helpers (`detectDuplicateCalendar`, `generateEventFingerprint`)

---

## AI scheduling flow

1. **Suggest schedule** — Nest `apps/api/src/ai/` (`OpenAI` / Anthropic / compatible). Web: `SuggestScheduleCard`.
2. **Pilot Brief** — Edge Function `supabase/functions/pilot-brief` reads Nest events + Supabase tasks, optional model, always has a fallback. Web page can regenerate via `functions/v1/pilot-brief`.

Keys stay server-side (Nest env or Edge secrets).

---

## Supabase data model (product)

Migrations under `supabase/migrations/`: profiles, calendars, events (Supabase copy), tasks, categories, attendees, share/booking links, preferences, reminders, orgs/members, contacts, friends, notifications, avatars bucket, `pilot_briefs` / messages.

RLS is the access control for those tables. This store is **not** the Nest event table.

---

## Prisma data model (calendar API)

`User`, `RefreshToken`, `CalendarConnection` (tokens), `ExternalCalendar`, `Event` (`source`: native|google|outlook|apple|apple_eventkit|booking), `Task` stub, `Organization`, `Team`, `Subscription`, `AuditLog`, sync logs.

---

## Edge Function responsibilities

| Function                         | Role                                      |
| -------------------------------- | ----------------------------------------- |
| `supabase/functions/pilot-brief` | Daily brief + chat; calls Nest for events |

Archived Edge Functions (Google OAuth, Stripe, email) live under `archive/legacy-v1` and are not the live path.

---

## Provider-specific adapters

| Provider       | Implementation                            | Interface?                                      |
| -------------- | ----------------------------------------- | ----------------------------------------------- |
| Google         | `googleapis` in Nest calendar-connections | No class implementing `CalendarProviderAdapter` |
| Microsoft      | `graph-client.ts`                         | Same                                            |
| Apple EventKit | iOS native + Nest ingest                  | `APPLE_EVENTKIT_CAPABILITIES` in lib            |
| Apple CalDAV   | `icloud-caldav.ts`                        | Dormant product path                            |
| ICS            | Legacy booking download only              | Not a live provider                             |

Nest maps `outlook` ↔ `microsoft` at the API boundary (`packages/lib` comment).
