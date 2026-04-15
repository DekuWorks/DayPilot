# DayPilot Flutter migration — task list

Use this checklist for Milestone 1 mobile beta. Check items off as you complete them.

**Last reviewed:** Implementation exists in `daypilot_flutter/`; see **Next** at bottom for release.

---

## Phase A — Foundation (1–5)

- [x] **1.** Create new Flutter project named `daypilot_flutter`
- [x] **2.** Install Flutter stable SDK and verify iOS + Android toolchains
- [x] **3.** Add dependencies: `supabase_flutter`, `go_router`, `flutter_riverpod`, `intl`, `shared_preferences`, `uuid`, `flutter_local_notifications`, `firebase_messaging`
- [x] **4.** Configure app name, bundle IDs, icons, splash, and environment config
- [x] **5.** Initialize Supabase in `main.dart`

## Phase B — Shell & routing (6–10)

- [x] **6.** Build app shell with App, router, theme, and auth bootstrap
- [x] **7.** Create feature-based folder structure under `lib/features`
- [x] **8.** Set up `go_router` with public and protected routes
- [x] **9.** Build auth flow: login, signup, forgot password, logout, session restore
- [x] **10.** Add auth guard and redirect logic

## Phase C — Domain & data (11–12)

- [x] **11.** Create domain models: User, Event, Attendee, RSVP, BookingPage, BookingSlot, Reminder, ShareLink, InsightSnapshot
- [x] **12.** Build repositories and services for auth, events, bookings, attendees, insights

## Phase D — Calendar & events (13–18)

- [x] **13.** Build month, week, and day calendar read views
- [x] **14.** Build event detail screen
- [x] **15.** Build create event screen with validation
- [x] **16.** Build edit event screen with validation
- [x] **17.** Add delete event flow
- [x] **18.** Connect event CRUD to Supabase

## Phase E — Bookings & attendees (19–21)

- [x] **19.** Build public booking page by slug
- [x] **20.** Build booking slot selection and booking confirmation flow
- [x] **21.** Build attendee list and RSVP flow

## Phase F — Realtime & insights (22–23)

- [x] **22.** Enable realtime on required tables and add live subscriptions
- [x] **23.** Build insights and daily brief screens

## Phase G — Notifications & resilience (24–26)

- [x] **24.** Add local notifications and push notification wiring
- [x] **25.** Add lightweight local caching and offline-friendly startup
- [x] **26.** Add loading, empty, and error states

## Phase H — Polish & release (27–30)

- [x] **27.** Add dark mode and responsive tablet polish (`ThemeMode.system`, `NavigationRail` ≥840px)
- [ ] **28.** Prepare TestFlight and Play internal testing builds
- [ ] **29.** Run QA pass for auth, calendar, events, bookings, RSVP, insights, notifications
- [ ] **30.** Launch Milestone 1 mobile beta

---

## Notes

- **Backend alignment:** The current web/API stack uses Nest + Prisma + Postgres. Flutter uses Supabase. Read **`docs/SUPABASE_API_ALIGNMENT.md`** and choose a production strategy.
- **Env:** `daypilot_flutter/README.md` — `--dart-define` for `SUPABASE_URL` / `SUPABASE_ANON_KEY` (no secrets in git).

---

## Next (do these now)

1. **Decide backend alignment** (Supabase-only vs API vs hybrid) — `docs/SUPABASE_API_ALIGNMENT.md`.
2. **Run manual QA** — `docs/FLUTTER_QA_CHECKLIST.md`.
3. **Ship internal builds** — Apple TestFlight + Google Play internal track (signing, store listings, privacy).
4. **Beta** — invite testers after QA sign-off.
