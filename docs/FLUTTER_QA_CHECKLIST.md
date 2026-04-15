# Flutter Milestone 1 — manual QA checklist

Run on **one physical device** (or emulator) per platform. Use real `SUPABASE_*` defines.

| # | Area | Steps | Pass |
|---|------|--------|------|
| 1 | **Cold start** | Kill app, launch; no crash; correct theme (light/dark follows system). | ☐ |
| 2 | **Missing config** | Run without `--dart-define` for Supabase; expect config screen, not crash. | ☐ |
| 3 | **Signup** | New email/password; lands in app (e.g. calendar). | ☐ |
| 4 | **Login** | Log out, log back in. | ☐ |
| 5 | **Forgot password** | Request reset; email received (if Supabase mail enabled). | ☐ |
| 6 | **Calendar** | Month / week / day views load; navigate between dates. | ☐ |
| 7 | **Create event** | Create with title + time; appears on calendar. | ☐ |
| 8 | **Detail / edit** | Open event, edit, save; changes visible. | ☐ |
| 9 | **Delete** | Delete event; removed from list/calendar. | ☐ |
| 10 | **Public booking** | Open `/book/<slug>` (deep link or router); load slot list; submit (if applicable). | ☐ |
| 11 | **Attendees** | Open attendee flow for an event; list matches expectations. | ☐ |
| 12 | **Insights** | Insights + daily brief screens load; data or empty state OK. | ☐ |
| 13 | **Realtime** | Second device/tab: change event; first view updates (if subscriptions on). | ☐ |
| 14 | **Notifications** | Local notification path (if triggered); FCM only if Firebase configured. | ☐ |
| 15 | **Tablet** | Widen window ≥840px; `NavigationRail` appears. | ☐ |
| 16 | **Offline** | Airplane mode: app opens; no hard crash (expect errors where network required). | ☐ |

**Sign-off:** _______________  **Date:** _______________

Notes:
