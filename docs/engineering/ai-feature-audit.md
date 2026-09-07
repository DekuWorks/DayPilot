# AI feature audit

**Date:** 7 September 2026  
**Confidence:** high on locations; medium on production model/cost (env not read).

## Surfaces

| Feature                 | Where                                                 | Model access                             |
| ----------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Schedule suggestions    | Nest `apps/api/src/ai/` + web `SuggestScheduleCard`   | `OPENAI_*` / `ANTHROPIC_*` on the API    |
| Pilot Brief             | `supabase/functions/pilot-brief` + web `/pilot-brief` | Optional; **fallback always works**      |
| Flutter / SwiftUI Pilot | Read the same `pilot_briefs` row                      | Do not rebuild the router (15 Aug audit) |

## Prompt construction

Pilot Brief builds a structured `BriefContent` (`summary`, counts, suggestions, conflicts, focus windows, follow-ups) and a `source: "ai" | "fallback"`. Events are reduced to `{ title, start, end }` before merge (`eventKey`). That is the right data-minimisation direction — do not send descriptions, attendees, or conferencing notes unless a later spec requires it.

Nest AI suggest is a separate path (`suggest-schedule.dto.ts`). Treat it as server-only.

## Risks

| Topic         | Status                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| Hallucination | Fallback path exists; UI should show `source`                                   |
| Permissions   | Function expects a user JWT; still uses CORS `*`                                |
| API failure   | Fallback brief must remain                                                      |
| Cost          | No quota/entitlement wrapper seen in the function header                        |
| Validation    | Response shaped in-function; clients should not render raw model text unchecked |
| Secrets       | Keys in Edge/Nest env — never `NEXT_PUBLIC_`                                    |

## Do not

- Log event titles to third-party analytics without a privacy review.
- Send the full Prisma event row (tokens, emails of attendees) to the model.
- Rebuild Pilot Brief as a SwiftUI-only model call.
