# Pilot Brief

Secure daily summary and chat, grounded in the authenticated user’s events and tasks.

## Endpoint

`POST {SUPABASE_URL}/functions/v1/pilot-brief`

Authorization: `Bearer <supabase_access_token>`

### Generate (default)

Body (optional): `{ "date": "2026-07-21" }` or `{ "action": "generate", "date": "2026-07-21" }`

Returns `{ "brief": { id, brief_date, content, created_at, updated_at } }`.

`content` includes `summary`, counts, `suggestions`, `conflicts`, `focus_windows`, `follow_ups`, and `source` (`ai` | `fallback`).

### Chat

Body: `{ "action": "chat", "message": "What should I tackle first?", "date": "2026-07-21" }`

Returns `{ "user_message", "reply", "source", "ai_error" }`.

Turns persist in `pilot_brief_messages` (one conversation per user per day). Clients also read that table directly via RLS.

## Behaviour

1. Authenticates the user
2. Loads today’s events + open tasks (service role, scoped by user id)
3. **Generate:** builds a structured brief, optionally enriches the summary with OpenAI if `OPENAI_API_KEY` is set, upserts `pilot_briefs`
4. **Chat:** answers from that same day context + recent turns, persists user + assistant rows
5. Never exposes provider keys

Without an AI key, a **rule-based fallback** still returns a useful brief and chat reply.

## Deploy

```bash
supabase db push --project-ref wmkytyrcxbzjqiykbauw
supabase functions deploy pilot-brief --project-ref wmkytyrcxbzjqiykbauw
```

Optional secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref wmkytyrcxbzjqiykbauw
```

## Schedule suggestions (Nest)

`POST {DAYPILOT_API_URL}/ai/suggest-schedule` with `{ "prompt": "2 hours for deep work tomorrow morning" }`.

Requires a Nest JWT. OpenAI / Anthropic keys stay on the API. Web and Flutter show the slots on Pilot Brief and can add a chosen event.

## Clients

- Web: `apps/web/src/lib/pilot-brief-api.ts` · UI at `/pilot-brief`
- Flutter: `daypilot_flutter/lib/data/services/pilot_brief_api.dart` · screen `/pilot-brief`
- SwiftUI scaffold: generate + chat via the same Edge Function (not the TestFlight app)
