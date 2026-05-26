#!/usr/bin/env bash
# Run Flutter with local secrets from dart-define.json (gitignored).
# Usage (from anywhere): bash daypilot_flutter/run.sh [-d chrome|...] [extra flutter run args]
set -euo pipefail
SCRIPT_ROOT="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_ROOT"
# macOS Desktop adds resource forks that break iOS CodeSign. Run from ~/Developer copy instead.
if [[ "$(uname -s)" == "Darwin" && "$SCRIPT_ROOT" == *"/Desktop/"* ]]; then
  DEV_RUN="${DAYPILOT_IOS_RUN_DIR:-$HOME/Developer/daypilot_flutter_run}"
  mkdir -p "$(dirname "$DEV_RUN")"
  rsync -a --delete \
    --exclude build --exclude .dart_tool --exclude ios/Pods --exclude ios/.symlinks \
    "$SCRIPT_ROOT/" "$DEV_RUN/"
  if [[ -f "$SCRIPT_ROOT/dart-define.json" ]]; then
    cp "$SCRIPT_ROOT/dart-define.json" "$DEV_RUN/dart-define.json"
  fi
  ROOT="$DEV_RUN"
  echo "iOS: running from $ROOT (Desktop folder breaks CodeSign; edit sources under Desktop/DayPilot/daypilot_flutter)"
fi
cd "$ROOT"
DEF_FILE="${FLUTTER_DART_DEFINE_FILE:-$ROOT/dart-define.json}"
if [[ ! -f "$DEF_FILE" ]]; then
  echo "Missing: $DEF_FILE"
  echo "Copy dart-define.example.json to dart-define.json and fill in Supabase + API URL."
  exit 1
fi
exec flutter run --dart-define-from-file="$DEF_FILE" "$@"
