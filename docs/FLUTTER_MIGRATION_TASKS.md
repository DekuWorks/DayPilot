# DayPilot Flutter migration — task list

Use this checklist for Milestone 1 mobile beta. Check items off as you complete them.

---

## Phase A — Foundation (1–5)

- [ ] **1.** Create new Flutter project named `daypilot_flutter`
- [ ] **2.** Install Flutter stable SDK and verify iOS + Android toolchains
- [ ] **3.** Add dependencies: `supabase_flutter`, `go_router`, `flutter_riverpod`, `intl`, `shared_preferences`, `uuid`, `flutter_local_notifications`, `firebase_messaging`
- [ ] **4.** Configure app name, bundle IDs, icons, splash, and environment config
- [ ] **5.** Initialize Supabase in `main.dart`

## Phase B — Shell & routing (6–10)

- [ ] **6.** Build app shell with App, router, theme, and auth bootstrap
- [ ] **7.** Create feature-based folder structure under `lib/features`
- [ ] **8.** Set up `go_router` with public and protected routes
- [ ] **9.** Build auth flow: login, signup, forgot password, logout, session restore
- [ ] **10.** Add auth guard and redirect logic

## Phase C — Domain & data (11–12)

- [ ] **11.** Create domain models: User, Event, Attendee, RSVP, BookingPage, BookingSlot, Reminder, ShareLink, InsightSnapshot
- [ ] **12.** Build repositories and services for auth, events, bookings, attendees, insights

## Phase D — Calendar & events (13–18)

- [ ] **13.** Build month, week, and day calendar read views
- [ ] **14.** Build event detail screen
- [ ] **15.** Build create event screen with validation
- [ ] **16.** Build edit event screen with validation
- [ ] **17.** Add delete event flow
- [ ] **18.** Connect event CRUD to Supabase

## Phase E — Bookings & attendees (19–21)

- [ ] **19.** Build public booking page by slug
- [ ] **20.** Build booking slot selection and booking confirmation flow
- [ ] **21.** Build attendee list and RSVP flow

## Phase F — Realtime & insights (22–23)

- [ ] **22.** Enable realtime on required tables and add live subscriptions
- [ ] **23.** Build insights and daily brief screens

## Phase G — Notifications & resilience (24–26)

- [ ] **24.** Add local notifications and push notification wiring
- [ ] **25.** Add lightweight local caching and offline-friendly startup
- [ ] **26.** Add loading, empty, and error states

## Phase H — Polish & release (27–30)

- [ ] **27.** Add dark mode and responsive tablet polish
- [ ] **28.** Prepare TestFlight and Play internal testing builds
- [ ] **29.** Run QA pass for auth, calendar, events, bookings, RSVP, insights, notifications
- [ ] **30.** Launch Milestone 1 mobile beta

---

## Notes

- **Backend alignment:** The current web/API stack uses Nest + Prisma + Postgres. If mobile uses Supabase, document how it maps to production (same project, Edge Functions, or a dedicated mobile backend).
- **Env:** Keep Supabase URL/keys out of source; use `--dart-define` or a small env layer per flavor (dev/staging/prod).
