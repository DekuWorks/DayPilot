# Supabase / database audit

**Date:** 7 September 2026  
**Confidence:** high on migration list and Prisma overlap; RLS details summarised from filenames and existing docs. Production was not queried.

**Do not run destructive migrations.**

---

## Two Postgres databases

| Store         | Used for                                                                                 | Migrations             |
| ------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Supabase      | Auth users, profiles, tasks, booking, orgs, friends, notifications, Pilot Brief, avatars | `supabase/migrations/` |
| Prisma / Nest | Nest users, events, calendar connections, subscriptions, audit                           | `prisma/`              |

ADR-001 said “Supabase primary”. Live 15 August 2026 audit reversed that for calendar: Graph/EventKit/JWT stay on Nest.

---

## Supabase migrations (filenames)

- `20260602190001_initial_schema.sql`
- `20260602190002_core_calendar_features.sql`
- `20260602190003_organizations.sql`
- `20260602190004_booking_links.sql`
- `20260602190005_mvp_persistence.sql`
- `20260602190006_realtime_and_rsvp_policies.sql`
- `20260721180000_rebrand_schema_gaps.sql`
- `20260721200000_profile_name_username.sql`
- `20260721210000_contacts.sql`
- `20260721220000_notifications_realtime.sql`
- `20260721230000_fix_org_members_rls_recursion.sql`
- `20260721240000_tasks_urgent_priority.sql`
- `20260726030000_friends_social.sql`
- `20260815150000_avatars_storage.sql`
- `20260816010000_workspace_unique_color.sql`
- `20260816020000_pilot_brief_messages.sql`

`20260721230000_fix_org_members_rls_recursion.sql` shows RLS has already bitten once (recursive org-member policies).

---

## Ownership

- Product tables: `auth.uid()` via RLS (user-owned profiles, tasks, booking links).
- Nest events: `Event.userId` → Prisma `User` created/linked at supabase-exchange.
- Shared calendars / booking: Supabase share and booking-link tables; not the same as Prisma `source: booking` until those paths meet.

---

## Edge Functions

| Path                                      | Notes                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/pilot-brief/index.ts` | User JWT for the caller; **`SUPABASE_SERVICE_ROLE_KEY` server-side** to read/write briefs. Also merges Nest `/events`. CORS `*`. |

No service-role usage in `apps/web`, `apps/api`, or Flutter clients. Do not add it to a browser bundle. `integration_connections.encrypted_credentials_reference` exists in Supabase but is **not** wired to Nest token storage.

---

## Risks

| Severity | Finding                                                                     |
| -------- | --------------------------------------------------------------------------- |
| HIGH     | Event truth split across two DBs                                            |
| HIGH     | Nest calendar tokens plaintext                                              |
| MEDIUM   | Org RLS recursion history — re-test any new org policy                      |
| MEDIUM   | Supabase `events` table may confuse new agents into writing the wrong store |
| LOW      | `packages` do not generate Supabase types in CI                             |

Indexes, FKs, and N+1 were not measured against production. Prisma `CalendarConnection` has `userId` indexes; Event uniqueness should stay on `(userId, source, externalId)` — verify before adding writes.
