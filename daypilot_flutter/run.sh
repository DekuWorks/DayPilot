#!/usr/bin/env bash
# Run Flutter with local secrets from dart-define.json (gitignored).
# Usage (from anywhere): bash daypilot_flutter/run.sh [-d chrome|...] [extra flutter run args]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
DEF_FILE="${FLUTTER_DART_DEFINE_FILE:-$ROOT/dart-define.json}"
if [[ ! -f "$DEF_FILE" ]]; then
  echo "Missing: $DEF_FILE"
  echo "Copy dart-define.example.json to dart-define.json and fill in Supabase + API URL."
  exit 1
fi
exec flutter run --dart-define-from-file="$DEF_FILE" "$@"
