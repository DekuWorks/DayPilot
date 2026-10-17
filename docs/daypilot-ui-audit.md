# DayPilot UI audit (Sprint 1)

**Date:** 16 October 2026  
**Base:** `origin/main` at `9631f41` (PR #32 founder people, PR #31 contact email)  
**Scope:** Phase 0 inventory and Phase 1 token check. No later sprint is done. Nothing here was deployed or merged.

## Stack correction

The pasted “DAYPILOT × 21ST.DEV” brief describes the wrong stack. `CLAUDE.md` is the source of truth.

| Brief                                   | Actual                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vite web app                            | Next.js 16 App Router in `apps/web`. Do not rewrite it to Vite. Do not add Vercel.                                                                           |
| Expo / React Native                     | Tester app is Flutter in `daypilot_flutter/`. SwiftUI in `apps/ios/` is the next iOS target. Do not scaffold Expo. Do not paste web components into Flutter. |
| Edge Functions for Graph, EventKit, JWT | NestJS + Prisma owns events, calendar connections, and the Nest JWT. Supabase owns auth, profiles, tasks, booking, and RLS.                                  |

## 21st.dev

21st.dev MCP is **not connected**. A search of the session tool catalog (Cursor, GitHub, Railway, Figma, Stripe, and the other loaded namespaces) returned no 21st.dev server. It was not installed. Sprint 1 does not depend on it.

No compatible 21st.dev components were selected. The web app already has the pieces a later visual pass should reuse: `apps/web/src/components/Button.tsx`, the `glass-effect` / `section-padding` / `container-width` classes in `apps/web/src/app/globals.css`, `MarketingNav`, `MarketingFooter`, `AppStoreBadge`, `PlanCatalog`, and `AppShell`. Do not add a component library.

## What is already there

**Public web** (`apps/web/src/app`): `/`, `/features`, `/pricing`, `/privacy`, `/login`, `/signup`, `/forgot-password`, `/book`, `/book/[slug]`. Home, features, and pricing share `MarketingNav` and `MarketingFooter`. The footer credits DekuWorks (`https://marcusbr.dev`) and shows the App Store badge (`apps/web/src/lib/app-store.ts` → DayPilot Daily, id `6798407960`). Pricing and privacy mail `dekuworks1@gmail.com`.

**Signed-in web** (`apps/web/src/app/(app)`, behind `RequireAuth` + `AppShell`): `/dashboard` (home calendar via `HomeDashboard`), `/calendar`, `/tasks`, `/booking-links`, `/insights`, `/focus`, `/pilot-brief`, `/meetings`, `/projects`, `/notes`, `/contacts`, `/friends`, `/sync`, `/integrations`, `/billing`, `/settings`. Founder Hub (`/settings/founder-hub`) is the private suggestion channel. People (`/settings/founder-people`) and the owner inbox render only when `founderHub.isOwner` is true (`FounderOwnerNav`, `FounderHubAccountLinks`). There is no public feedback page.

**Plans** (`packages/lib/src/pricing/catalog.ts`): Free $0; Founding 25 $5/month (purchasable, cap described in copy as the first 25; live count stays on `GET /billing/founding`); Pro $10/month (purchasable). Team ($20/month planned) and Enterprise (custom) are waitlists, not sold. `co.daypilot` personal / business / enterprise are not in this catalog.

**Flutter** (`daypilot_flutter/lib/core/routing/app_router.dart`): tabs for `/home`, `/tasks`, `/insights`, `/profile`, plus tasks, notes, projects, meetings, contacts, friends, settings, founder hub / inbox / people, search, booking links, billing, notifications, integrations, sync, Pilot Brief, and events. Home is a greeting, next event, and calendar (`home_screen.dart`). Billing sells Founding 25 and Pro and links Team and Enterprise to the website waitlist anchors. There is no `/focus` route.

**SwiftUI** (`apps/ios/`): sign-in plus Today, Calendar, Tasks, Pilot, Sync, Settings. Not a daily-driver replacement for Flutter. Left unchanged.

## Tokens

Web tokens live in `apps/web/src/styles/tokens.css` and are bridged into Tailwind 4 in `apps/web/src/app/globals.css`. Dark surfaces are sage (`--background-primary: #0c1210`, `--brand-500: #3d9b6a`). Light mode overrides the same semantic names under `[data-theme="light"]`. Spacing tokens `--space-4/6/8` already match `.section-padding` (1rem / 1.5rem / 2rem).

Flutter surfaces in `DayPilotScheme` match those sage hex values. SwiftUI `DayPilotTheme` does not.

## Inconsistencies (not changed)

These are real, and fixing them would change what people see. Sprint 1 does not restyle the app.

| Issue                                                                                      | Where                                                                                                                                                                                 | Why it waited                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Brand doc still says “electric green” (`#42E85F`, `#8CFF3F`, `#0A0B0D`)                    | `docs/BRAND_GUIDELINES.md` (21 July 2026)                                                                                                                                             | Rewriting the brand doc is a later decision, not a token rename.                         |
| Comment still says “electric green”                                                        | `apps/web/src/app/globals.css`                                                                                                                                                        | Comment only. Bundled with the glow fix below.                                           |
| Neon glow `rgba(66,232,95,…)` on a sage brand                                              | `Button.tsx` hover shadow; home hero in `apps/web/src/app/page.tsx`                                                                                                                   | Visible. Use `--brand-500` only after a browser check.                                   |
| Default new calendar colour `#42E85F`                                                      | `apps/web/src/lib/events-supabase.ts`                                                                                                                                                 | Writes a stored colour. Not a CSS token swap.                                            |
| Flutter brand constants are neon (`#6CFF4A`, `#39FF14`, `#16B947`) while surfaces are sage | `daypilot_flutter/lib/core/theme/app_theme.dart`                                                                                                                                      | Tester-app restyle. Do not copy web widgets in.                                          |
| SwiftUI green is `#42E85F` on a near-black background                                      | `apps/ios/.../DayPilotTheme.swift`                                                                                                                                                    | Separate from the Flutter tester app.                                                    |
| Radius names disagree                                                                      | Tokens: `--radius-md` 12px, `--radius-xl` 20px. Tailwind `rounded-md` is 6px, `rounded-xl` is 12px, `rounded-2xl` is 16px. `rounded-[10px]` on `login/page.tsx` and `CalendarApp.tsx` | Remapping `@theme` radius would restyle a large set of cards.                            |
| Side-project swatch `#7C3AED` vs category `--projects` `#a855f7`                           | `nav-config.ts`, `workspace-colors.ts`, `tokens.css`                                                                                                                                  | Recolours workspace chips. Personal, work, and school already match the category tokens. |
| Error red differs                                                                          | Web `--error` `#f04438`; Flutter `DayPilotColors.error` `#FF4B4B`                                                                                                                     | Small, but it is a Flutter colour change.                                                |
| `--surface-elevated` equals `--surface-secondary`                                          | `tokens.css`                                                                                                                                                                          | No second elevation colour exists. Do not invent one.                                    |

`Button` already uses semantic colour variables for fill, text, and border. Most marketing and app chrome uses `var(--text-*)`, `var(--surface-*)`, and `var(--border-*)`. That is enough for this sprint.

## Later sequence

Do these only after this audit is accepted. Do not treat them as done.

1. **Sprint 2 — web glow only.** Point the two `rgba(66,232,95)` shadows at `--brand-500`, and correct the electric-green comment in `globals.css`. Check the homepage hero and a primary button in light and dark. Leave Flutter, SwiftUI, calendar insert colour, and radius alone.
2. **Sprint 3 — radius.** Pick one scale (the CSS tokens or Tailwind’s defaults) and migrate call sites in small batches, starting with `rounded-[10px]`. Visual check of login, calendar view switch, and card-heavy pages.
3. **Sprint 4 — native colour.** Align Flutter `DayPilotColors.brand*` with the sage already used by `DayPilotScheme`, then SwiftUI `DayPilotTheme`, in separate changes. Run the Flutter theme test. Do not submit an iOS build from that work.
4. **Sprint 5 — marketing consistency.** Reuse `Button` and existing cards on pages that still hand-roll controls. Keep the App Store badge, DekuWorks footer, `dekuworks1@gmail.com`, and the owner-only people tab. No public feedback channel. No new plans, testimonials, or metrics.

## This sprint’s change

Documentation only. No application code, no token values, no component library.
