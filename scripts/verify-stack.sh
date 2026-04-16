#!/usr/bin/env bash
# Quick checks after wiring Option C (local). Run from repo root: bash scripts/verify-stack.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== DayPilot stack checks =="
echo ""

if [[ ! -f .env ]]; then
  echo "WARN: No .env in repo root. Copy .env.example to .env and fill DATABASE_URL, JWT_SECRET, SUPABASE_URL or SUPABASE_JWT_SECRET."
else
  echo "OK: .env exists"
  # shellcheck source=/dev/null
  source .env 2>/dev/null || true
  if [[ -n "${SUPABASE_URL:-}" ]]; then
    echo "OK: SUPABASE_URL is set (JWKS verification for /auth/supabase-exchange)"
  fi
  if [[ -n "${SUPABASE_JWT_SECRET:-}" ]]; then
    echo "OK: SUPABASE_JWT_SECRET is set (length ${#SUPABASE_JWT_SECRET})"
  fi
  if [[ -z "${SUPABASE_URL:-}" && -z "${SUPABASE_JWT_SECRET:-}" ]]; then
    echo "WARN: Neither SUPABASE_URL nor SUPABASE_JWT_SECRET in .env — POST /auth/supabase-exchange will fail."
  fi
fi

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001}"
API_URL="${API_URL%/}"
echo ""
echo "Probing API: GET $API_URL/health"
if curl -sf "$API_URL/health" > /dev/null; then
  echo "OK: API health"
else
  echo "FAIL: Could not reach $API_URL/health — start API: pnpm dev --filter @daypilot/api"
  exit 1
fi

echo ""
echo "Next: run Flutter with --dart-define for SUPABASE_URL, SUPABASE_ANON_KEY, DAYPILOT_API_URL"
echo "  Android emulator API host: http://10.0.2.2:3001"
echo "See docs/OPTION_C_SETUP.md"
