# Mobile audit

**Date:** 7 September 2026  
**Confidence:** high on split of responsibilities; medium on Flutter internals not fully re-walked this session.

## Two clients

|              | Flutter `daypilot_flutter/`              | SwiftUI `apps/ios/`             |
| ------------ | ---------------------------------------- | ------------------------------- |
| Role         | Tester daily driver (TestFlight)         | Product target (ADR-004)        |
| Auth         | Supabase + Nest exchange                 | Same, via `NestAPIClient`       |
| Calendar     | EventKit + Nest events                   | EventKit mapper + Nest sync DTO |
| New features | Frozen except crash/sync/auth/TestFlight | Allowed, through repositories   |

There is **no** Expo / React Native app. Do not scaffold `apps/ios` as RN.

---

## EventKit vs Sign in with Apple

- EventKit: OS calendar permission. Required to see iCloud/Google-on-device/subscribed calendars locally and to POST the cloud copy.
- Sign in with Apple: Supabase identity only.
- Deep link for setup: `com.daypilot.daypilot://integrations/apple-calendar` (web handoff page).

If Sign in with Apple succeeds and the calendar is empty, check EventKit permission — not the Apple SSO token.

---

## Other mobile topics

| Topic            | Notes                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Auth persistence | SwiftUI `InMemorySessionStore` is a gap vs Flutter                                                                                       |
| Widgets          | Flutter shipped home/lock-screen widgets (commit `74d012d`). ADR-004 says do not start new WidgetKit work on SwiftUI in the 90-day slice |
| Notifications    | Flutter wiring exists historically; confirm permission copy distinguishes calendar vs alerts                                             |
| Background sync  | EventKit ingest is app-driven POST, not a documented server pull of iCloud                                                               |
| Offline          | Flutter caching mentioned in older docs; SwiftUI not there yet                                                                           |
| iPhone / iPad    | Flutter is the QA target; Android is frozen                                                                                              |
| Secrets          | `dart-define.json` gitignored; no Google/Microsoft client secrets in the iOS bundle (ADR-004)                                            |

---

## Recommendations

1. Keychain session store for SwiftUI.
2. Surface EventKit `denied` on web (`mapAppleEventKitUi`).
3. Keep Flutter TestFlight alive until SwiftUI parity.
4. Do not add Expo.
