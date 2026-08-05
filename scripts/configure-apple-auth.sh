#!/usr/bin/env bash
# Enable Apple SSO on DayPilot Supabase Auth.
#
# Usage:
#   ./scripts/configure-apple-auth.sh \
#     --services-id com.daypilot.daypilot.web \
#     --team-id TEAMID \
#     --key-id KEYID \
#     --p8 /path/to/AuthKey_KEYID.p8
#
# Or with a pre-generated client-secret JWT:
#   ./scripts/configure-apple-auth.sh \
#     --services-id com.daypilot.daypilot.web \
#     --secret 'eyJ...'
#
# Prerequisites:
#   1. Apple Services ID + Sign in with Apple key (.p8) — see docs/APPLE_AUTH_SETUP.md
#   2. Return URL: https://wmkytyrcxbzjqiykbauw.supabase.co/auth/v1/callback
#   3. Supabase CLI logged in (`supabase login`)
#   4. python3 + PyJWT[crypto] (or cryptography) to mint the secret JWT from .p8

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="wmkytyrcxbzjqiykbauw"
SERVICES_ID="${SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID:-}"
BUNDLE_ID="com.daypilot.daypilot"
TEAM_ID="${APPLE_TEAM_ID:-}"
KEY_ID="${APPLE_KEY_ID:-}"
P8_PATH="${APPLE_P8_PATH:-}"
SECRET="${SUPABASE_AUTH_EXTERNAL_APPLE_SECRET:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --services-id) SERVICES_ID="$2"; shift 2 ;;
    --bundle-id) BUNDLE_ID="$2"; shift 2 ;;
    --team-id) TEAM_ID="$2"; shift 2 ;;
    --key-id) KEY_ID="$2"; shift 2 ;;
    --p8) P8_PATH="$2"; shift 2 ;;
    --secret) SECRET="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SERVICES_ID" ]]; then
  read -r -p "Apple Services ID (e.g. com.daypilot.daypilot.web): " SERVICES_ID
fi

if [[ -z "$SECRET" ]]; then
  if [[ -z "$TEAM_ID" ]]; then
    read -r -p "Apple Team ID: " TEAM_ID
  fi
  if [[ -z "$KEY_ID" ]]; then
    read -r -p "Apple Key ID: " KEY_ID
  fi
  if [[ -z "$P8_PATH" ]]; then
    read -r -p "Path to AuthKey_*.p8: " P8_PATH
  fi
fi

if [[ -z "$SERVICES_ID" ]]; then
  echo "Services ID is required." >&2
  exit 1
fi

mint_secret() {
  local team_id="$1" key_id="$2" services_id="$3" p8="$4"
  if [[ ! -f "$p8" ]]; then
    echo "p8 file not found: $p8" >&2
    exit 1
  fi
  TEAM_ID="$team_id" KEY_ID="$key_id" SERVICES_ID="$services_id" P8_PATH="$p8" python3 - <<'PY'
import os, time, sys
try:
    import jwt
except ImportError:
    sys.stderr.write(
        "PyJWT is required. Install with:\n"
        "  python3 -m pip install 'PyJWT[crypto]'\n"
    )
    sys.exit(1)

team_id = os.environ["TEAM_ID"]
key_id = os.environ["KEY_ID"]
services_id = os.environ["SERVICES_ID"]
with open(os.environ["P8_PATH"], "r", encoding="utf-8") as f:
    private_key = f.read()

now = int(time.time())
# Apple allows max ~6 months; use ~5.5 months for safety.
exp = now + 15777000
token = jwt.encode(
    {
        "iss": team_id,
        "iat": now,
        "exp": exp,
        "aud": "https://appleid.apple.com",
        "sub": services_id,
    },
    private_key,
    algorithm="ES256",
    headers={"kid": key_id, "alg": "ES256"},
)
# PyJWT may return str or bytes depending on version
print(token if isinstance(token, str) else token.decode("utf-8"))
PY
}

if [[ -z "$SECRET" ]]; then
  if [[ -z "$TEAM_ID" || -z "$KEY_ID" || -z "$P8_PATH" ]]; then
    echo "Need --secret OR (--team-id + --key-id + --p8)." >&2
    exit 1
  fi
  echo "Minting Apple client-secret JWT (valid ~6 months)..."
  SECRET="$(mint_secret "$TEAM_ID" "$KEY_ID" "$SERVICES_ID" "$P8_PATH")"
fi

# Supabase Client IDs: Services ID first (web OAuth), then iOS bundle ID.
CLIENT_IDS="$SERVICES_ID"
if [[ -n "$BUNDLE_ID" && "$BUNDLE_ID" != "$SERVICES_ID" ]]; then
  CLIENT_IDS="${SERVICES_ID},${BUNDLE_ID}"
fi

export SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID="$CLIENT_IDS"
export SUPABASE_AUTH_EXTERNAL_APPLE_SECRET="$SECRET"

CONFIG_TOML="$ROOT/supabase/config.toml"
if grep -q '^\[auth.external.apple\]' "$CONFIG_TOML"; then
  CONFIG_TOML="$CONFIG_TOML" python3 - <<'PY'
from pathlib import Path
import os
p = Path(os.environ["CONFIG_TOML"])
text = p.read_text()
marker = "[auth.external.apple]"
i = text.find(marker)
if i < 0:
    raise SystemExit("missing [auth.external.apple] in config.toml")
head, rest = text[: i + len(marker)], text[i + len(marker) :]
section, sep, tail = rest.partition("\n[")
section = section.replace("enabled = false", "enabled = true", 1)
if "enabled = true" not in section:
    section = "\nenabled = true" + section
p.write_text(head + section + (("\n[" + tail) if sep else ""))
print("Set auth.external.apple.enabled = true in config.toml")
PY
fi

echo "Pushing Auth config (Apple enabled + redirect URLs) to $PROJECT_REF..."
cd "$ROOT"
supabase config push --project-ref "$PROJECT_REF" --yes

echo ""
echo "Done. Verify:"
echo "  1. https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo "  2. Apple → Enabled"
echo "  3. Client IDs start with Services ID: $SERVICES_ID"
echo "  4. Mobile: Continue with Apple → returns to DayPilot"
echo "  5. Web: https://www.daypilot.co/login → Continue with Apple"
echo ""
echo "Reminder: rotate the Apple secret JWT every 6 months (re-run this script)."
echo "Calendar sync is separate — see docs/CALENDAR_INTEGRATIONS_SETUP.md"
