#!/usr/bin/env bash
# Interactive helper: paste OAuth credentials into repo-root .env and restart Nest API.
# Usage: ./scripts/configure-calendar-oauth.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example first."
  exit 1
fi

echo "DayPilot calendar OAuth setup"
echo "============================="
echo ""
echo "Create credentials first (see docs/CALENDAR_INTEGRATIONS_SETUP.md):"
echo "  Google redirect:  http://localhost:3001/calendar-connections/google/callback"
echo "  Outlook redirect: http://localhost:3001/calendar-connections/outlook/callback"
echo ""

read -r -p "Google Client ID (or Enter to skip): " GOOGLE_ID
if [[ -n "$GOOGLE_ID" ]]; then
  read -r -sp "Google Client Secret: " GOOGLE_SECRET
  echo ""
fi

read -r -p "Microsoft Client ID (or Enter to skip): " MS_ID
if [[ -n "$MS_ID" ]]; then
  read -r -sp "Microsoft Client Secret: " MS_SECRET
  echo ""
fi

set_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # macOS sed
    sed -i '' "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${val}\"" >> "$ENV_FILE"
  fi
}

[[ -n "${GOOGLE_ID:-}" ]] && set_env GOOGLE_CLIENT_ID "$GOOGLE_ID"
[[ -n "${GOOGLE_SECRET:-}" ]] && set_env GOOGLE_CLIENT_SECRET "$GOOGLE_SECRET"
[[ -n "${MS_ID:-}" ]] && set_env MICROSOFT_CLIENT_ID "$MS_ID"
[[ -n "${MS_SECRET:-}" ]] && set_env MICROSOFT_CLIENT_SECRET "$MS_SECRET"

# Ensure URLs for local dev
set_env API_URL "http://localhost:3001"
set_env FRONTEND_URL "http://localhost:3002"

echo ""
echo "Updated $ENV_FILE"
echo ""
echo "Restarting Nest API (if running on port 3001)..."
if lsof -ti:3001 >/dev/null 2>&1; then
  PID=$(lsof -ti:3001 | head -1)
  kill "$PID" 2>/dev/null || true
  sleep 1
fi

cd "$ROOT/apps/api"
pnpm dev &
sleep 4

if curl -sf http://localhost:3001/health >/dev/null; then
  echo "API is up at http://localhost:3001"
else
  echo "Start API manually: cd apps/api && pnpm dev"
fi

echo ""
echo "Next: open http://localhost:3002/integrations and click Connect on Google or Outlook."
