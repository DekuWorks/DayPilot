# Redesign audit

Reference: `docs/design/daypilot-redesign-reference.jpg`. Branch: `feature/redesign-mockup` from `origin/main` (ee9ffbb).

## Real stack (the task list said Vite + Expo; that is not what runs)

| Area       | What exists                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Web        | Next.js 16 App Router, React 19, Tailwind 4, `apps/web`, static export to GitHub Pages              |
| API        | NestJS 11 + Prisma, `apps/api`. Not touched                                                         |
| Tester iOS | Flutter, `daypilot_flutter/`. This is the app on the App Store (1.0.2 build 21, waiting for review) |
| Next iOS   | SwiftUI, `apps/ios/`. Not touched                                                                   |
| Auth       | Supabase session + Nest JWT bridge                                                                  |

## Mockup regions against what exists

| Mockup region                                                            | Real route / file today                                                                   | Gap                                                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Marketing header (logo, Features, Pricing, Founders Hub, Blog, Download) | `components/MarketingNav.tsx`. Sticky, full-bleed, borderless                             | No Founders Hub link. **No blog route exists, so Blog is omitted**                                              |
| Hero, headline, badge, two phones                                        | `app/page.tsx`. Centred hero with an illustrated desktop preview                          | Layout is centred, not split. No phone frames                                                                   |
| Four-point value strip                                                   | none                                                                                      | Add, with true claims only                                                                                      |
| Dark six-card row                                                        | `FeatureGrid` (nine emoji cards on `/features`)                                           | Add six cards for the six screens                                                                               |
| iOS app screens strip + final CTA                                        | none                                                                                      | Add                                                                                                             |
| Pricing                                                                  | `LaunchPricing`. Founding $5 (first 25, live count from `GET /billing/founding`), Pro $10 | Keep as is                                                                                                      |
| App sidebar                                                              | `components/shell/AppSidebar.tsx`. 13 primary links, workspaces, secondary                | Reorder to Today, Calendar, Tasks, Booking, Insights, Founders Hub, Settings. Remaining links move under "More" |
| Top bar (search, New, avatar)                                            | `AppHeader.tsx`. Greeting in the bar, search, bell, calendar icon, avatar                 | Move greeting into the page. Add a New menu                                                                     |
| Dashboard (greeting, four stats, schedule, tasks, upcoming)              | `/dashboard` is the Month/Week/Day calendar. `/calendar` redirects to it                  | Build a Today dashboard. Host the calendar at `/calendar`                                                       |
| Flutter tabs                                                             | Home, Tasks, Insights, Profile. Home hosts the calendar                                   | Today, Calendar, Tasks, Insights tabs. Booking and Founders Hub stay as routes                                  |

## Data already available for the dashboard

- Events: `listEvents({ from, to })` (Nest first, Supabase fallback).
- Tasks: Supabase `tasks` (`status`, `due_at`, `priority`). Completion writes `status` and `completed_at`.
- Focus: `listFocusSessions` (completed `durationSeconds`).
- Founders Hub: `user.founderHub.{isOwner,isFoundingMember,unreadCount}` from the Nest session.
- Founding count: `GET /billing/founding` via `FoundingSpotLine`.

## Things the mockup shows that DayPilot does not have

| Mockup shows                                                                           | Real position                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Alex", "Aug 8, 2024", 3 tasks left, 2 meetings, 4h focus, 72% goal, +12% productivity | Real user name, today's date, counts from real data, "Unavailable" when a source fails. No goal setting exists, so the ring shows tasks done against tasks due today     |
| Avatar pile and "Join early adopters"                                                  | No testimonials or people to show. Omitted                                                                                                                               |
| Blog link                                                                              | No blog route. Omitted                                                                                                                                                   |
| Public Founders Hub feed ("Early access", "Feature discussion")                        | The hub is private to founding members and the owner. The card shows a locked members-only state, never a feed                                                           |
| Drag-and-drop time blocking                                                            | Not implemented. Card title kept, no drag claim                                                                                                                          |
| Google Meet, Zoom, Teams, Slack, Discord, Phone in a booking picker                    | Meet, Zoom and Teams are not created by DayPilot. Supported: meeting link, phone, Slack, Discord                                                                         |
| "Help & Support" nav item                                                              | No help route. Omitted                                                                                                                                                   |
| Real iPhone screenshots                                                                | None exist in the repo. `assets/brand/daypilot-ios-ui-showcase.png` is an illustration with invented data. Phone frames use structural previews with no invented figures |

## Constraints carried through

- Sage brand `#2E8B57`, `#3D9B6A`, `#1B7A4A`. Existing logo.
- Marketing header: full-bleed, sticky, `--background-primary`, no divider.
- Keep DekuWorks footer link (https://marcusbr.dev), mailto, founder people admin, StoreKit purchase fix.
- No deploy. No iOS upload. No App Store Connect.
