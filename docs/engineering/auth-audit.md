# Authentication audit

**Date:** 7 September 2026  
**Confidence:** high

## Identity Authentication vs Calendar Data Authorization

```text
Identity Authentication
  Supabase Auth: email/password, magic link, Google, Apple, Microsoft
  Proves who the DayPilot user is.
  Tokens: Supabase session (+ Nest JWT after exchange).

Calendar Data Authorization
  Separate grant to read/write a provider calendar.
  Google: Nest OAuth (`calendar.events`, `calendar.readonly`) — not granted by Google SSO
  Outlook: Nest OAuth, or Microsoft SSO `provider_token` when login requested `Calendars.ReadWrite`
  Apple: EventKit permission on the device (not Sign in with Apple)
```

**Sign in with Apple is not EventKit and is not iCloud CalDAV.**  
The web handoff page already states this (`apps/web/src/app/app/integrations/apple-calendar/page.tsx`).  
`mapAppleEventKitUi` comment: “Profile/Sync Apple row = EventKit, never Sign in with Apple.”

If a tester signs in with Apple and sees an empty calendar, that is expected until the iOS app grants EventKit and syncs.

---

## Web

| Topic            | Implementation                                                                      |
| ---------------- | ----------------------------------------------------------------------------------- |
| Session SOT      | Supabase (`AuthProvider`)                                                           |
| Nest bridge      | `exchangeNestSession` → `localStorage` keys `accessToken` / `refreshToken` / `user` |
| Unlock           | UI unlocks when Supabase session exists; Nest/profile enrich is background          |
| Deadlock guard   | No `await` inside `onAuthStateChange`                                               |
| SSO              | `loginWithGoogle`, `loginWithMicrosoft`, `loginWithApple({ next })`                 |
| Protected routes | App shell + auth callback                                                           |
| Auto calendar    | `maybeAutoConnectCalendars` — Google/Microsoft identities only                      |

### Known issue: Apple/iCloud sign-in without calendar events

Reproduced in product terms (not a crashed API):

1. User completes Sign in with Apple (identity succeeds).
2. No EventKit permission is requested on web.
3. `maybeAutoConnectCalendars` skips Apple identities.
4. `GET /events` has no `apple_eventkit` rows until iOS sync.

This is a **category error** if the UI implies Apple SSO “connected the calendar”. Sync/Integrations copy must keep saying “open the iPhone app”.

---

## Mobile

| Client  | Auth                                                         | Persistence                                            |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Flutter | Supabase + `POST /auth/supabase-exchange` (`NestApiSession`) | Nest JWTs in **SharedPreferences**, not secure storage |
| SwiftUI | Same exchange via `NestAPIClient`                            | `InMemorySessionStore`; no Nest refresh-token rotation |

Account linking: Nest resolves the user **by email** at `exchangeFromSupabaseAccessToken`. There is no Supabase `user.id` on Prisma `User`. Apple Hide My Email (`@privaterelay.appleid.com`) vs Gmail can create **two Nest users**. No link-accounts UI.

---

## Token refresh and logout

- Supabase refreshes its own session.
- Nest refresh tokens are hashed in Prisma (`RefreshToken`).
- Logout should clear both stores (`clearNestSession` + Supabase signOut). If only one is cleared, the other client may still look signed in.

---

## Recommendations

1. After Apple SSO, land on `/sync?apple=sso` with an EventKit-only banner (do not start CalDAV).
2. Web Nest JWTs are memory + httpOnly cookies (`dp_access` / `dp_refresh`). Flutter uses Keychain via `flutter_secure_storage`. SwiftUI uses `KeychainSessionStore`.
3. Nest users are linked by Supabase `sub` first (`users.supabase_user_id`), then email. Hide My Email vs Gmail still cannot auto-merge — that needs an explicit link-accounts flow.
4. Never reuse Sign in with Apple as a calendar health signal.
