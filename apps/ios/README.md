# DayPilot iOS (SwiftUI)

Greenfield client. Bundle **`com.dekuworks.daypilot.swift`** so TestFlight 12 (`com.dekuworks.daypilot`) stays installable. iOS 17+. Clean Architecture: views talk to use cases; only `Data/` talks to Supabase, Nest, and EventKit.

## Layout

- `Sources/DayPilotCore/` — entities, use cases, Nest/Supabase REST adapters
- `Tests/DayPilotCoreTests/` — use-case and contract tests (`swift test`)
- `App/DayPilot/` — SwiftUI shell, EventKit store, Google ASWebAuthenticationSession

## 90-day bar

- Email + Google via Supabase (no provider secrets in the bundle)
- Nest JWT via `POST /auth/supabase-exchange`
- Calendar read: `GET /events`
- Sync status: `GET /calendar-connections`
- Native EventKit → `POST /calendar-connections/apple/eventkit/sync` (250-event chunks, `syncStartedAt`)
- Profile photo: `profiles.avatar_url`
- Pilot Brief **read** of `pilot_briefs` (same row web writes)

## Configure

```bash
cd apps/ios
cp Config.example.xcconfig Config.local.xcconfig
# Set SUPABASE_ANON_KEY (public anon key, same as Flutter)
```

Keep `DAYPILOT_API_URL` on Railway until `https://api.daypilot.co/health` returns 200.

## Generate the Xcode project

```bash
brew install xcodegen   # once
xcodegen generate
open DayPilot.xcodeproj
```

## Tests

```bash
swift test
```
