# DayPilot API (C#)

C# API for DayPilot (e.g. Google Calendar discovery). No Supabase — uses your own auth and data store.

## Requirements

- .NET 8 SDK

## Configuration

Edit `DayPilot.Api/appsettings.json` (or use environment variables / Fly secrets):

| Setting | Description |
|--------|-------------|
| **ConnectionStrings:DefaultConnection** | SQLite: `Data Source=daypilot.db` (or Postgres connection string) |
| **Jwt:Secret** | Secret for signing JWTs (use a long random string in production) |
| **Jwt:Issuer** | e.g. `daypilot-api` |
| **Jwt:Audience** | e.g. `daypilot-app` |
| **Jwt:ExpirationMinutes** | Token lifetime (e.g. 10080 = 7 days) |
| **Google:ClientId** | Google OAuth client ID |
| **Google:ClientSecret** | Google OAuth client secret |
| **FrontendUrl** | Frontend base URL for OAuth redirects (e.g. `https://www.daypilot.co`) |
| **Cors:AllowedOrigins** | Allowed origins (e.g. `https://www.daypilot.co`, `http://localhost:5174`) |

## Endpoints

### GET /health

Returns `{ "status": "ok" }`.

### Auth (no Supabase)

- **POST /api/auth/register** — body: `{ "email", "password", "name?" }` → `{ "token", "user" }`
- **POST /api/auth/login** — body: `{ "email", "password" }` → `{ "token", "user" }`
- **GET /api/auth/google** — redirects to Google (sign-in); `?return_path=/app`
- **GET /api/auth/google/callback** — OAuth callback; redirects to frontend with `?token=JWT`
- **GET /api/me** — current user (requires `Authorization: Bearer <token>`)
- **GET /api/me/connected-accounts** — list connected accounts (requires Bearer)
- **DELETE /api/me/connected-accounts/:id** — disconnect (requires Bearer)

### Google Connect (Integrations)

- **GET /api/google/authorize** — redirects to Google (connect calendars). Use `?return_path=/app/integrations` and either `Authorization: Bearer <token>` or `?token=JWT`
- **GET /api/google/callback** — OAuth callback; stores tokens, redirects to frontend

### POST /api/google/discover

Lists the user's Google calendars (read-only, no persistence).

**Request body:**

```json
{
  "accessToken": "google_access_token",
  "refreshToken": "google_refresh_token_optional_for_refresh"
}
```

**Response (200):**

```json
{
  "success": true,
  "calendarsDiscovered": 2,
  "calendars": [
    {
      "id": "primary",
      "summary": "My Calendar",
      "accessRole": "owner",
      "backgroundColor": "#9e69af",
      "description": null
    }
  ]
}
```

Your app is responsible for: obtaining Google tokens (OAuth), storing them, and persisting calendar mappings if needed.

## Run locally

```bash
cd api/DayPilot.Api
dotnet run
```

API listens on `http://localhost:5000` (or the port in launchSettings.json).

## Deploy

### Docker (recommended)

Build and run locally:

```bash
cd api/DayPilot.Api
docker build -t daypilot-api .
docker run -p 8080:8080 \
  -e Google__ClientId=YOUR_CLIENT_ID \
  -e Google__ClientSecret=YOUR_CLIENT_SECRET \
  -e Cors__AllowedOrigins__0=https://www.daypilot.co \
  daypilot-api
```

API: `http://localhost:8080` — Swagger: `http://localhost:8080/swagger`

### GitHub Actions

On push to `main` (when `api/**` changes) or via **Actions → Build and deploy API → Run workflow**:

1. **Image** is built and pushed to **GitHub Container Registry**: `ghcr.io/<your-org>/daypilot-api:latest`
2. **Fly.io deploy** runs automatically if the repo secret **FLY_API_TOKEN** is set (see below).

#### Deploy to Fly.io (live URL)

1. Install [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) and run `fly auth login`.
2. From `api/DayPilot.Api` run:
   ```bash
   fly apps create daypilot-api   # if the app doesn't exist yet
   fly secrets set Google__ClientId=YOUR_GOOGLE_CLIENT_ID Google__ClientSecret=YOUR_GOOGLE_CLIENT_SECRET
   fly secrets set Cors__AllowedOrigins__0=https://www.daypilot.co
   fly secrets set FrontendUrl=https://www.daypilot.co
   fly secrets set Jwt__Secret=YOUR_LONG_RANDOM_JWT_SECRET
   fly deploy
   ```
   For persistent data in production, consider Postgres (e.g. `ConnectionStrings__DefaultConnection`) instead of SQLite.
3. Your API will be at **https://daypilot-api.fly.dev** (or the URL shown by `fly status`).
4. To have GitHub Actions deploy on every push: create a deploy token with `fly tokens create deploy` and add it as a repo secret **FLY_API_TOKEN**.

Set **VITE_GOOGLE_DISCOVER_API_URL** in the web app to your Fly URL (e.g. `https://daypilot-api.fly.dev`).

#### Other hosts

Use the image `ghcr.io/<your-org>/daypilot-api:latest` in **Azure Container Apps**, **AWS ECS**, or any host that runs Docker. Set **Google:ClientId**, **Google:ClientSecret**, and **Cors:AllowedOrigins** as environment variables (e.g. `Google__ClientId`, `Cors__AllowedOrigins__0`).

### Other hosts

Deploy to Azure App Service, AWS, or your own server (e.g. `dotnet publish` and run behind IIS/Nginx). Set **Google:ClientId**, **Google:ClientSecret**, and **Cors:AllowedOrigins** in the host configuration.

## Frontend

Set **VITE_GOOGLE_DISCOVER_API_URL** to your API base URL (e.g. `https://your-api.com`). The app will call `POST {base}/api/google/discover` with a body that includes the user's Google tokens (your frontend must obtain and send these from your own auth/store).
