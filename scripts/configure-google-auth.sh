#!/usr/bin/env bash
# Enable Google SSO on DayPilot Supabase Auth + optionally store calendar OAuth in .env.
#
# Usage:
#   ./scripts/configure-google-auth.sh
#   ./scripts/configure-google-auth.sh --client-id ID --client-secret SECRET
#
# Prerequisites:
#   1. Google Cloud OAuth Web client with redirect:
#      https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback
#   2. Supabase CLI logged in (`supabase login`)
#   3. See docs/GOOGLE_AUTH_SETUP.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="wmkytyrcxbzjqiykbauw"
ENV_FILE="$ROOT/.env"
CLIENT_ID="${SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID:-}"
CLIENT_SECRET="${SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET:-}"
ALSO_CALENDAR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client-id) CLIENT_ID="$2"; shift 2 ;;
    --client-secret) CLIENT_SECRET="$2"; shift 2 ;;
    --also-calendar) ALSO_CALENDAR=1; shift ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CLIENT_ID" ]]; then
  read -r -p "Google OAuth Client ID: " CLIENT_ID
fi
if [[ -z "$CLIENT_SECRET" ]]; then
  read -r -sp "Google OAuth Client Secret: " CLIENT_SECRET
  echo ""
fi

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "Client ID and secret are required." >&2
  exit 1
fi

if [[ "$CLIENT_ID" != *".apps.googleusercontent.com" ]]; then
  echo "Warning: Client ID usually ends with .apps.googleusercontent.com" >&2
fi

export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="$CLIENT_ID"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="$CLIENT_SECRET"

CONFIG_TOML="$ROOT/supabase/config.toml"
if grep -q '^\[auth.external.google\]' "$CONFIG_TOML"; then
  # Flip enabled = true for the Google block (first occurrence after the section).
  CONFIG_TOML="$CONFIG_TOML" python3 - <<'PY'
from pathlib import Path
import os
p = Path(os.environ["CONFIG_TOML"])
text = p.read_text()
marker = "[auth.external.google]"
i = text.find(marker)
if i < 0:
    raise SystemExit("missing [auth.external.google] in config.toml")
head, rest = text[: i + len(marker)], text[i + len(marker) :]
section, sep, tail = rest.partition("\n[")
section = section.replace("enabled = false", "enabled = true", 1)
if "enabled = true" not in section:
    section = "\nenabled = true" + section
p.write_text(head + section + (("\n[" + tail) if sep else ""))
print("Set auth.external.google.enabled = true in config.toml")
PY
fi

echo "Pushing Auth config (Google enabled + redirect URLs) to $PROJECT_REF..."
cd "$ROOT"
supabase config push --project-ref "$PROJECT_REF" --yes

set_env() {
  local key="$1"
  local val="$2"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE — skip writing calendar credentials."
    return
  fi
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${val}\"" >> "$ENV_FILE"
  fi
}

if [[ "$ALSO_CALENDAR" -eq 1 ]]; then
  set_env GOOGLE_CLIENT_ID "$CLIENT_ID"
  set_env GOOGLE_CLIENT_SECRET "$CLIENT_SECRET"
  echo "Also wrote GOOGLE_CLIENT_ID / SECRET to .env (calendar sync)."
fi

echo ""
echo "Done. Verify:"
echo "  1. https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo "  2. Google → Enabled"
echo "  3. Mobile: Continue with Google → returns to DayPilot"
echo "  4. Web: https://www.daypilot.co/login → Continue with Google"
