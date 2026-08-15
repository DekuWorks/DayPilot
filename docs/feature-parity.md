# Feature parity matrix

**Date:** 2026-08-15  
**Purpose:** Honest web vs Flutter vs SwiftUI 90-day bar. Close **data-contract** holes first (same Supabase tables, same Nest event shape). Full Pilot AI 2.0 and a scheduling-engine rewrite are after this slice.

**Confidence:** high for shipped web/Flutter surfaces; medium for SwiftUI until TestFlight on `com.dekuworks.daypilot.swift`.

Legend: **Yes** = works for testers · **Partial** = UI or contract exists but gaps remain · **No** = not in this client · **90d** = SwiftUI target this slice · **Later** = explicitly out of 90 days

---

## Auth and profile

| Capability | Web | Flutter TF 12 | SwiftUI 90d | Contract |
|------------|-----|---------------|-------------|----------|
| Email / password | Yes | Yes | 90d | Supabase Auth |
| Google SSO | Yes | Yes | 90d | Supabase Auth |
| Apple SSO | Yes | Yes | Later if redirect already works | Supabase Auth |
| Microsoft SSO | Yes | Partial | Later | Supabase Auth |
| Nest JWT exchange | Yes | Yes | 90d | `POST /auth/supabase-exchange` |
| Profile photo | Yes (`profiles.avatar_url` + SSO fallback) | Yes after force-quit on 12; persist-if-missing on next build | 90d | `profiles.avatar_url`, bucket `avatars` |

---

## Calendar and sync

| Capability | Web | Flutter TF 12 | SwiftUI 90d | Contract |
|------------|-----|---------------|-------------|----------|
| Month / week / day | Yes | Yes (Home) | 90d | `GET /events?from=&to=` |
| Create / edit native events | Yes | Yes | Later | `POST/PATCH /events` |
| Google connect + sync | Yes | Yes | Status only (connect stays Nest/web or Flutter) | Nest OAuth + `calendar_connections` |
| Outlook connect + sync | Yes (Graph `/v1.0` bug until deploy) | Same Nest API | Status only | Nest Graph; list via `GET /calendar-connections` |
| Apple EventKit → cloud copy | Read-only of ingest | Yes (chunked 250, `syncStartedAt`) | 90d native EventKit + same POST | `POST /calendar-connections/apple/eventkit/sync` |
| Sync status (Google / Outlook / Apple) | Yes `/sync` | Yes | 90d | Nest list endpoint |
| iCloud CalDAV password | Partial | Partial | Later | Nest Apple CalDAV |

---

## Pilot, tasks, booking

| Capability | Web | Flutter TF 12 | SwiftUI 90d | Contract |
|------------|-----|---------------|-------------|----------|
| Pilot Brief read | Yes `/pilot-brief` | Partial (Insights / daily brief) | 90d read | `pilot_briefs` for today |
| Pilot Brief generate | Yes (Edge Function) | Partial | Later | `POST …/functions/v1/pilot-brief` |
| Tasks list / detail | Yes | Yes | Shell only | Supabase tasks |
| Booking links | Yes | Yes | Later | Supabase booking |
| Meetings (event list) | Yes | Yes | Later | Nest events |

---

## Product areas not in the 90-day SwiftUI bar

| Area | Web | Flutter | SwiftUI |
|------|-----|---------|---------|
| Notes / projects / contacts / friends | Yes | Yes | Later |
| Insights charts | Yes | Yes | Later |
| Billing / StoreKit | Yes / Partial | Partial | Out |
| Widgets / Live Activities / App Intents | — | — | Out |
| Enterprise / MCP / Foundation Models | — | — | Out |

---

## Data-contract holes to close first

1. **Outlook Graph** — no double `v1.0`; page `calendarView`; retry 429. Same Nest path for every client.
2. **EventKit DTO** — SwiftUI must send the Flutter payload (`deviceId`, calendars, events, range, `syncStartedAt`, 250-event chunks).
3. **Avatar** — one column: `profiles.avatar_url`. Do not invent a second photo store.
4. **Connection list** — `GET /calendar-connections` is the source of truth. SwiftUI must not start a second OAuth.
5. **Pilot Brief** — read `pilot_briefs` the way `apps/web/src/lib/pilot-brief-api.ts` does. Do not fork the schema.

---

## Flutter freeze

After the core list (avatar + Graph deploy, EventKit ingest kept, parity docs), Flutter is **maintenance only**: crash, sync, auth, TestFlight keep-alive. New product work goes to Nest/web contracts and SwiftUI.
