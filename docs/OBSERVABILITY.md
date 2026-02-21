# Observability (Phase 11)

Logging, error tracking, and basic metrics for the API and web app.

---

## 1. API

### Request logging

- Every request is logged after completion: **method**, **path**, **status code**, **duration**.
- Implemented via `LoggingInterceptor`; log level is **log** for success and **warn** for errors.
- Example: `GET /events 200 45ms`, `POST /auth/login 401 12ms - Invalid email or password`.

### Error tracking (Sentry)

- If **`SENTRY_DSN`** is set, the API initializes Sentry and sends **5xx** errors (and unhandled exceptions) to Sentry.
- A global exception filter logs the error and, for 5xx, calls `Sentry.captureException` with URL, method, and status.
- **Env:** `SENTRY_DSN` (optional). Get a DSN from [sentry.io](https://sentry.io) → Project → Client Keys (DSN).

### Health and metrics

- **`GET /health`** — Returns `{ status: 'ok' | 'degraded', db?: 'ok' | 'error' }`. Use for load balancers, Fly.io, or k8s probes. DB is checked with a simple `SELECT 1`. **Not rate-limited** (`@SkipThrottle()`).
- **`GET /metrics`** — Returns `{ uptimeSeconds, requestCount }` (in-memory). Use for dashboards or to feed into Prometheus later. **Not rate-limited**.

### Where to see logs

- **Local:** stdout (e.g. terminal where you run `pnpm dev` or `node dist/main.js`).
- **Production:** Your host’s log aggregation (e.g. Fly.io logs, Railway logs, or a log drain to Datadog/Logtail).

---

## 2. Web (Next.js)

### Error tracking (Sentry)

- If **`NEXT_PUBLIC_SENTRY_DSN`** is set, the frontend initializes Sentry in the browser and server.
- **Server:** `sentry.server.config.ts` (Node); **client:** `instrumentation-client.ts` (browser).
- **`app/global-error.tsx`** captures React rendering errors and sends them to Sentry.
- **Env:** `NEXT_PUBLIC_SENTRY_DSN` (optional). Use the same Sentry project as the API or a separate frontend project.

### Source maps (optional)

- To get readable stack traces in Sentry, upload source maps at build time.
- Set **`SENTRY_AUTH_TOKEN`**, **`SENTRY_ORG`**, and **`SENTRY_PROJECT`** in your build environment (e.g. Vercel).
- Create an auth token at Sentry → Settings → Auth Tokens. Add it as a secret in Vercel (or CI).

---

## 3. Env summary

| Variable | Where | Purpose |
|----------|--------|---------|
| `SENTRY_DSN` | API | Send API errors to Sentry |
| `NEXT_PUBLIC_SENTRY_DSN` | Web | Send frontend errors to Sentry |
| `SENTRY_AUTH_TOKEN` | Web build | Upload source maps (optional) |
| `SENTRY_ORG` | Web build | Sentry org slug (optional) |
| `SENTRY_PROJECT` | Web build | Sentry project slug (optional) |

---

## 4. Metrics

- **API:** `GET /metrics` returns `uptimeSeconds` and `requestCount` (see Health and metrics above). You can scrape this or extend it to Prometheus text format later.
- Request duration and status are also in logs; you can pipe logs to a metrics system (e.g. parse and aggregate in Datadog, or use a log-based metric).
