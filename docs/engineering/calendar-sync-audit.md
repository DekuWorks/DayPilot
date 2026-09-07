# Calendar sync audit

**Date:** 7 September 2026  
**Confidence:** high on code paths; medium on production rate limits (not exercised here).

## Provider matrix

| Provider                  | Live?    | Connect                    | Fetch               | Notes                                                  |
| ------------------------- | -------- | -------------------------- | ------------------- | ------------------------------------------------------ |
| Google Calendar           | Yes      | Nest OAuth                 | Google Calendar API | Auto-connect after Google SSO                          |
| Outlook / Microsoft Graph | Yes      | Nest OAuth or `from-token` | `calendarView`      | Must use Graph host + `defaultVersion: v1.0` only once |
| Apple EventKit            | Yes      | iOS permission + POST sync | Device → Nest       | Web is a cloud copy, read-oriented                     |
| Apple CalDAV / iCloud ASP | Dormant  | `POST /apple/connect`      | CalDAV              | Not the product path                                   |
| ICS                       | No       | —                          | —                   | Legacy booking `.ics` download only                    |
| Local device              | iOS only | EventKit                   | Local UI            | Also uploaded as `apple_eventkit`                      |

There is **no** ICS subscription adapter in the live Nest module.

---

## Flow

```text
Connect Provider
      ↓
Authorization (OAuth or EventKit)
      ↓
Token / Native Permission
      ↓
Calendar Discovery
      ↓
Event Fetch
      ↓
Normalization (source, externalId, fingerprint)
      ↓
Prisma Event + ExternalCalendar
      ↓
GET /events → unified calendar
```

---

## Issues already fixed on historical branches

- Graph `/v1.0/v1.0` (`fix/shared-avatar-and-graph-v1`)
- EventKit 413 large uploads (`fix/eventkit-413-and-session`)
- Null EventKit availability crash (`fix/apple-calendar-null-availability`)
- Honest Google expired vs Apple EventKit status (`fix/calendar-connections-status-ui`)

---

## Remaining defects

### HIGH — Apple SSO ≠ calendar access

Identity success does not populate events. Web/iOS must keep the two states separate. `mapAppleEventKitUi` still treats any EventKit **connection row** as `healthy`, even if `calendarStatus` is `denied` / `permission_required` / `restricted`.

### HIGH — Tokens at rest (remediated on `fix/critical-audit-remediation`)

`CalendarConnection` writes go through AES-256-GCM when `CALENDAR_TOKEN_ENCRYPTION_KEY` is set (32-byte hex or base64). Sealed values use the `enc:v1:` prefix. Legacy plaintext still decrypts as pass-through so existing rows keep working. Generate a key with `openssl rand -hex 32` and set it on the API host. Do not commit the key.

### MEDIUM — Dual event stores

Supabase `events` (RLS) vs Prisma `Event`. Clients that read the wrong store look “out of sync”.

### MEDIUM — Recurrence / timezone / all-day on Google and Outlook

Prisma has `allDay`, `timezone`, `recurrenceRule`. EventKit ingest writes them. **Google and Outlook sync do not** — Google uses `singleEvents: true` (expanded instances, no RRULE stored) and import omits timezone/all-day. Unified UI can lie about all-day Outlook/Google rows.

Web `apps/web/src/lib/events.ts` prefers Nest when a Nest JWT exists, else falls back to Supabase `events`. Those two tables can disagree (KI-001).

### MEDIUM — Token expiry UX

OAuth rows can show `expired` / `needs_reconnect`. EventKit rows do not use that vocabulary.

### LOW — Rate limits

No explicit Google/Graph backoff module found beyond provider SDK defaults.

### LOW — Stale EventKit rows

`shouldDeleteStaleEventKitRow` is unit-tested; still depends on iOS sending a full snapshot.

---

## Adapter interface

`CalendarProviderAdapter` in `packages/lib` is the target shape. Nest still uses a single `CalendarConnectionsService` with provider `if` branches. A class-per-provider refactor would touch every OAuth path. **Do not do that in this pass** — duplication is real, but destabilising working Google/Outlook is a worse trade.

---

## Phase 7 fix (this branch)

`mapAppleEventKitUi` now treats EventKit `calendarStatus` of `denied`, `restricted`, `permission_required`, `unavailable`, or `error` (and `syncStatus === error`) as `needsAttention`, with copy that asks the user to allow Calendar access on iPhone — not to sign in with Apple again.

Regression: `apps/web/src/lib/calendar-connection-ui.spec.ts`.
