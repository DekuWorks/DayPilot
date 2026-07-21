# Web Progress

**Last updated:** 2026-07-21

| Feature | Status | Owner | Started | Completed | Related files | Tests | Notes | Blockers | Next action |
|---------|--------|-------|---------|-----------|---------------|-------|-------|----------|-------------|
| Marketing rebrand | [~] | agent | 2026-07-21 | — | `apps/web/src/app/page.tsx` | — | New hero copy + dashboard preview; more sections TBD | — | Full marketing sections |
| Design tokens | [x] | agent | 2026-07-21 | 2026-07-21 | `styles/tokens.css`, `globals.css` | — | Dark + brand-50…900 | — | — |
| Design system components | [~] | agent | 2026-07-21 | — | `Button.tsx` | — | Button restyled | — | Input, Card, Badge, etc. |
| App shell (sidebar/header) | [x] | agent | 2026-07-21 | 2026-07-21 | `components/shell/*`, `(app)/layout.tsx` | — | Collapsible sidebar, ⌘K placeholder, workspaces, mobile drawer | — | Command palette |
| Dashboard (approved layout) | [x] | agent | 2026-07-21 | 2026-07-21 | `components/home/HomeDashboard.tsx` | — | Metrics, schedule, tasks, Pilot Brief, mini cal, quick actions, insights strip | — | Wire focus sessions |
| Calendar CRUD UI | [x] | agent | 2026-07-21 | 2026-07-21 | `events-supabase` + MonthCalendarView | — | Create/list/delete on Supabase | — | Day/week/agenda |
| Tasks UI | [x] | agent | 2026-07-21 | 2026-07-21 | `(app)/tasks` | — | Supabase CRUD + filters | — | Subtasks/priority polish |
| Auth screens rebrand | [x] | agent | 2026-07-21 | 2026-07-21 | AuthProvider + login/signup | — | Supabase Auth + Google button | Enable Google in dashboard | Magic link |
| Projects / Meetings / Notes | [~] | agent | 2026-07-21 | — | stub routes | — | Coming soon pages | Backend | MVP later |
| Pilot Brief UI | [x] | agent | 2026-07-21 | 2026-07-21 | `/pilot-brief` + Home card | — | Edge Function wired | Optional OPENAI secret | Ask flow |
| Command palette ⌘K | [~] | agent | 2026-07-21 | — | AppHeader | — | Search UI placeholder | — | Implement palette |
| Insights charts | [~] | agent | 2026-07-21 | — | `(app)/insights` | — | Stub | Data queries | Phase 5 |
| Brand asset wiring | [x] | agent | 2026-07-21 | 2026-07-21 | `assets/brand/*`, `public/brand/*` | — | Logo, icon, mockups, favicon | — | OG image polish |
