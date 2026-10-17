# Redesign plan

Order of work. One commit per area.

1. **Docs.** Reference image, audit, this plan.
2. **Marketing homepage** (`apps/web`).
   - `MarketingNav`: add Founders Hub (gated page), "Download for iPhone" pill. Header stays borderless.
   - New `components/marketing/PhonePreview.tsx`: CSS phone frame and six structural screens. No invented numbers or names.
   - New `HomeHero`, `ValueStrip`, `ScreenCards` (dark band), `IosScreens` strip, `FinalCta`.
   - `app/page.tsx` composes them and keeps `LaunchPricing`.
   - Tokens: allow a nested `data-theme="dark"` band so the six-card row stays dark in light mode.
3. **Signed-in web shell.**
   - `nav-config.ts`, `AppSidebar.tsx`: Today, Calendar, Tasks, Booking, Insights, Founders Hub (if authorised), More, Settings.
   - `AppHeader.tsx`: search, New menu, notifications, avatar. Greeting moves into the page.
   - `/dashboard`: Today dashboard (stats, schedule, tasks, upcoming). Reuses the existing events, tasks and focus calls.
   - `/calendar`: hosts `CalendarApp` (was a redirect). `?create=1` opens the event form for the New menu.
4. **Flutter.** Tabs Today, Calendar, Tasks, Insights. Today dashboard screen with real data and Unavailable states. Founders Hub and Booking restyled only where needed. Native widgets, sage theme, safe areas.
5. **Pricing.** Check only. Change nothing unless it diverges. Billing logic is untouched.

## Verification

- `pnpm --filter @daypilot/web run lint` and `run build`.
- `pnpm --filter @daypilot/web test` (node tests under `src/lib`).
- `flutter analyze` and `flutter test` in `daypilot_flutter/`.
- Browser: marketing pages at desktop and 390px, dark and light. Signed-in screens only if a session exists.

## Out of scope

Backend, Vite, Expo, Vercel, SwiftUI, IPA upload, App Store Connect, deploys, merging.
