# DayPilot API (C#)

C# API for DayPilot (e.g. Google Calendar discovery). No Supabase — uses your own auth and data store.

## Requirements

- .NET 8 SDK

## Configuration

Edit `DayPilot.Api/appsettings.json` (or use environment variables / User Secrets):

| Setting | Description |
|--------|-------------|
| **Google:ClientId** | Google OAuth client ID (for token refresh) |
| **Google:ClientSecret** | Google OAuth client secret |
| **Cors:AllowedOrigins** | Allowed origins (e.g. `https://www.daypilot.co`, `http://localhost:5174`) |

## Endpoints

### GET /health

Returns `{ "status": "ok" }`.

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

On push to `main` (when `api/**` changes) or via **Actions → Build and push API image → Run workflow**, the API is built and pushed to **GitHub Container Registry**:

- Image: `ghcr.io/<your-org>/daypilot-api:latest`
- Use this image in **Azure Container Apps**, **AWS ECS**, **Fly.io**, or any host that runs Docker. Set **Google:ClientId**, **Google:ClientSecret**, and **Cors:AllowedOrigins** as environment variables (e.g. `Google__ClientId`, `Cors__AllowedOrigins__0`).

### Other hosts

Deploy to Azure App Service, AWS, or your own server (e.g. `dotnet publish` and run behind IIS/Nginx). Set **Google:ClientId**, **Google:ClientSecret**, and **Cors:AllowedOrigins** in the host configuration.

## Frontend

Set **VITE_GOOGLE_DISCOVER_API_URL** to your API base URL (e.g. `https://your-api.com`). The app will call `POST {base}/api/google/discover` with a body that includes the user's Google tokens (your frontend must obtain and send these from your own auth/store).
