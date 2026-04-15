# Supabase and the Nest API (DayPilot)

The **web app** and **Nest API** use **PostgreSQL via Prisma** (`apps/api`, `prisma/schema.prisma`).

The **Flutter app** uses **Supabase** (`supabase_flutter`) and reads/writes tables such as `events`, `calendars`, etc.

Those are **not automatically the same database** unless you wire them together.

## Options

Pick one direction for production:

### A. Supabase as the mobile backend (single Postgres)

1. Use **Supabase Postgres** as the source of truth.
2. Mirror or migrate your Prisma schema into Supabase (or generate SQL from Prisma and apply in Supabase).
3. Point **Nest** at the same Supabase Postgres `DATABASE_URL` (if you keep the API), or retire duplicate writes from web.
4. Configure **Row Level Security (RLS)** in Supabase for every table the Flutter client touches.

### B. Nest API only (Flutter calls HTTP, not Supabase tables)

1. Replace Supabase data calls in Flutter with **REST** (or GraphQL) to your deployed API.
2. Keep **Supabase Auth** only if you still want it—otherwise use JWT from your API login.
3. Larger refactor: repositories switch from `SupabaseClient` to `dio`/`http` + your API.

### C. Hybrid (common for betas)

- Supabase for **auth + realtime** only.
- **Events/calendar** still go through Nest via a thin API layer. Requires new Flutter repositories and API endpoints.

## What to do next

1. Decide **A, B, or C** for Milestone 1.
2. Document the chosen **URL** and **env** for Flutter (`SUPABASE_*` vs `NEXT_PUBLIC_API_URL`).
3. Run a **single test user** through: signup → create event → see it on web (or vice versa) to prove alignment.
