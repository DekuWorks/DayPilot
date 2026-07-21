# Pilot Brief

Secure daily summary generated from the authenticated user’s events and tasks.

## Endpoint

`POST {SUPABASE_URL}/functions/v1/pilot-brief`

Authorization: `Bearer <supabase_access_token>`

Body (optional): `{ "date": "2026-07-21" }`

## Behavior

1. Authenticates the user
2. Loads today’s events + open tasks (service role, scoped by user id)
3. Builds a structured brief
4. Optionally enriches the summary with OpenAI if `OPENAI_API_KEY` is set on the function
5. Upserts into `pilot_briefs`
6. Returns the brief (never exposes provider keys)

Without an AI key, a **rule-based fallback** still returns a useful brief.

## Deploy

```bash
supabase functions deploy pilot-brief --project-ref wmkytyrcxbzjqiykbauw
```

Optional secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref wmkytyrcxbzjqiykbauw
```

## Web client

`apps/web/src/lib/pilot-brief-api.ts` · UI at `/pilot-brief`
