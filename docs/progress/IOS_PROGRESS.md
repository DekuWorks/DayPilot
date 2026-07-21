# iOS Progress

**Last updated:** 2026-07-21  
**Constraint:** iOS only this milestone — do not optimize Android.

| Feature | Status | Owner | Started | Completed | Related files | Tests | Notes | Blockers | Next action |
|---------|--------|-------|---------|-----------|---------------|-------|-------|----------|-------------|
| Stack decision (Expo vs Flutter) | [x] | owner | 2026-07-21 | 2026-07-21 | ADR-002 | — | Flutter iOS chosen | — | — |
| Expo app scaffold | [x] | — | — | 2026-07-21 | — | — | Rejected — not building Expo | — | — |
| Flutter rebrand path | [~] | agent | 2026-07-21 | — | `daypilot_flutter/` | — | Dark theme + brand colors applied | — | Screen pass |
| App icon + splash (new brand) | [x] | agent | 2026-07-21 | 2026-07-21 | `assets/branding/app_icon.png` | — | launcher_icons + native_splash regenerated | — | Visual QA on device |
| Auth + SecureStore | [~] | — | — | — | Flutter auth | — | Supabase Auth present | ADR-002 | Port or restyle |
| Onboarding | [ ] | — | — | — | — | — | — | — | — |
| Home / Calendar / Tasks | [~] | — | — | — | Flutter features | — | No dedicated Tasks tab parity | ADR-002 | — |
| Insights + Pilot Brief | [~] | — | — | — | Flutter insights | — | Daily brief screen exists | — | Rebrand + API |
| Share schedule | [~] | — | — | — | Flutter booking | — | Booking flows exist | — | — |
| Push + deep links | [~] | — | — | — | FCM wiring | — | QA incomplete | — | — |
| TestFlight | [ ] | — | — | — | Flutter release workflow | — | Secrets required | Stack + QA | — |
