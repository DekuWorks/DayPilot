# Activation funnel (no new analytics vendor)

DayPilot does not ship a product-analytics SDK (no PostHog, Amplitude, Mixpanel, or gtag). Sentry is present on the web app for errors. Do not add a new tracking service for this funnel, and do not put event titles, emails, calendar contents, or other personal data into Sentry or any future events.

When a provider is added later, these events are the set to instrument. Properties are booleans, counts, or coarse enums only.

| Event                     | When                                                             | Allowed properties                                |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `onboarding_started`      | Signed-out person opens signup or the login screen               | `surface`: `web` or `ios`                         |
| `onboarding_completed`    | Supabase session exists and the home calendar has rendered       | `surface`                                         |
| `calendar_connected`      | A calendar connection becomes connected                          | `provider`: `google`, `outlook`, `apple_eventkit` |
| `first_task_created`      | First task row for that user                                     | none                                              |
| `first_plan_opened`       | First successful Pilot Brief or schedule-suggestion response     | `kind`: `pilot_brief` or `suggestion`             |
| `first_scheduling_action` | First booking link created, or first public booking confirmed    | `kind`: `link_created` or `booking_confirmed`     |
| `return_use`              | Authenticated home opened on a later calendar day than the first | `surface`                                         |

Do not send the booking slug, booker name, or booker email.
