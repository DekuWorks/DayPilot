# DayPilot Supabase schema

Migrations for DayPilot (Supabase primary — ADR-001). Used by Flutter iOS and the web cutover.

**Project:** `wmkytyrcxbzjqiykbauw` — [dashboard](https://supabase.com/dashboard/project/wmkytyrcxbzjqiykbauw)

## Apply / update remote

```bash
cd /path/to/DayPilot
# Requires SUPABASE_DB_PASSWORD in .env (or pass -p to link)
supabase link --project-ref wmkytyrcxbzjqiykbauw --password "$SUPABASE_DB_PASSWORD"
supabase db push
```

Local:

```bash
supabase start
supabase db reset   # applies all migrations + seed when present
```

## What’s included

| Migration | Contents |
|-----------|----------|
| `20260602190001` | `profiles`, `calendars`, `events`, signup trigger (default calendar) |
| `20260602190002` | Event reminders, all-day, recurrence columns |
| `20260602190003` | Organizations, members, calendar scopes |
| `20260602190004` | Booking links, availability, bookings |
| `20260602190005` | Attendees, tasks, share links, preferences, reminders |
| `20260602190006` | Realtime on `events`, attendee RSVP policies |
| `20260721180000` | **Rebrand gaps:** workspaces, projects, notes, subtasks, focus_sessions, pilot_briefs, notifications, device_tokens, integration_connections, profile/preference/calendar/event/task enhancements + RLS |

## Nest freeze note

Nest/Prisma is legacy. New schema work belongs here. See `docs/architecture/SUPABASE_MIGRATION.md`.
