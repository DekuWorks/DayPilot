# Performance audit

**Date:** 7 September 2026  
**Confidence:** medium (static review, no profiler run).

## Web

- Auth: session unlock is fast-path; Nest exchange timed at 2.5s (`NEST_EXCHANGE_TIMEOUT_MS`). Good.
- `maybeAutoConnectCalendars` can redirect the whole window to Google OAuth after first SSO — feels like a hang if the user expected the home calendar.
- Calendar widgets (`WeekCalendarView`, `DayTimeline`) render event lists in-component. No `react-window` / virtualization dependency. Large synced days will get expensive.
- Duplicate fetches: Auth enrich + calendar pages each call connections/events. React Query is present — use it for connections/events consistently.
- Bundle: Next 16 + Sentry + stripe + socket.io-client. Acceptable; do not add another calendar kit without measuring.

## API / sync

- EventKit ingest is chunked after the 413 incident.
- Graph `calendarView` is range-bounded — keep windows tight.
- No explicit sync batching/backoff module.
- `GET /metrics` is in-memory request counts only (`docs/OBSERVABILITY.md`).

## Mobile

- Two runtimes (Flutter + SwiftUI) on a device increase install/QA cost, not runtime of a single app.
- Flutter startup/offline: existing caching mentioned in older audits; not re-profiled.
- SwiftUI `InMemorySessionStore` forces re-login (product issue more than FPS).

## Supabase

- Pilot Brief function merges Nest events and tasks in Deno. Keep payloads to “today” only (already implied by brief date).
- Avatars bucket is the right place for photos — do not embed large SSO images in every event query.

## Recommendations (not implemented here)

1. Virtualise day/week event lists above a few hundred events.
2. Cache `listConnections` + `getEventKitStatus` in React Query with a shared key.
3. Do not auto-redirect Google OAuth on every new browser profile without a Sync CTA.
