# Production hardening (Phase 12)

Rate limiting, CORS, validation, env schema, and deployment notes for the API and web app.

---

## 1. API

### Rate limiting

- **ThrottlerModule** is enabled globally: **100 requests per 60 seconds** per IP by default. Configure via env:
  - **`THROTTLE_TTL`** — Window in milliseconds (default `60000`).
  - **`THROTTLE_LIMIT`** — Max requests per window (default `100`).
- **`POST /billing/webhook`** and **`GET /health`**, **`GET /metrics`** are excluded via `@SkipThrottle()`.
- To exclude more routes: use `@SkipThrottle()` on the controller or method.

### CORS

- **`CORS_ORIGIN`** is read at startup. You can set:
  - **Empty / unset:** allow all origins (`true`).
  - **Comma-separated list:** e.g. `https://app.example.com,https://www.example.com`. No spaces required; spaces around commas are trimmed.
- **Credentials** are enabled so the frontend can send cookies/authorization headers when you use cookie-based auth later.

### Validation

- **ValidationPipe** is global with:
  - **whitelist:** strip properties not in the DTO.
  - **forbidNonWhitelisted:** reject requests with extra properties.
  - **transform:** coerce query/body to DTO types (e.g. string → number where defined).
- Use **class-validator** decorators on DTOs (`IsString`, `IsEmail`, `@MinLength`, etc.).

### Env schema

- At bootstrap, the API **validates env** and exits with a clear error if:
  - **Production (`NODE_ENV=production`):** **`JWT_SECRET`** is required and must not be `change-me-in-production`.
  - **`DATABASE_URL`** (if set): must be a `postgresql`, `postgres`, `file`, or `sqlite` URL.
- This avoids starting in production with a default or missing JWT secret.

### Secure cookies (future)

- The API currently uses **Bearer token** auth (no cookies). If you add cookie-based sessions later:
  - Set **httpOnly**, **secure** (HTTPS only), and **sameSite: 'lax'** or **'strict'** on the cookie.
  - Prefer **sameSite: 'lax'** for normal web apps so top-level navigations still send the cookie.

### HTTPS

- The API does not terminate TLS. Use a reverse proxy or platform (Fly.io, Railway, etc.) to serve over HTTPS. Fly.io and most hosts enforce HTTPS in production.

---

## 2. Web (Next.js)

- **HTTPS:** Handled by the host (e.g. Vercel). No extra config needed.
- **Cookies:** If you store tokens in cookies later, use **httpOnly**, **secure**, and **sameSite** in the cookie options (e.g. in the API when setting the cookie, or in middleware).

---

## 3. Env checklist (API production)

| Variable | Required in prod | Notes |
|----------|------------------|--------|
| `NODE_ENV` | Set to `production` | Enables JWT_SECRET check. |
| `JWT_SECRET` | Yes | Long random string; must not be `change-me-in-production`. |
| `DATABASE_URL` | Yes (if using DB) | Postgres (or SQLite) URL. |
| `CORS_ORIGIN` | Recommended | Comma-separated allowed origins. |
| `PORT` | Optional | Default 3000. |
| `SENTRY_DSN` | Optional | Observability (Phase 11). |
| `THROTTLE_TTL` | Optional | Rate limit window in ms (default 60000). |
| `THROTTLE_LIMIT` | Optional | Max requests per window (default 100). |
| Stripe / Google / etc. | As needed | See deployment docs. |
