#!/usr/bin/env bash
# Create index.html at each SPA route so GitHub Pages returns 200 instead of 404.
# Run from repo root with: apps/web/scripts/spa-fallback-pages.sh apps/web/dist

set -e
DIST="${1:-apps/web/dist}"
INDEX="${DIST}/index.html"

if [ ! -f "$INDEX" ]; then
  echo "Error: ${INDEX} not found. Run from repo root after build." >&2
  exit 1
fi

# Static routes from App.tsx (no dynamic segments)
ROUTES=(
  login
  signup
  features
  pricing
  ui-demo
  app
  app/calendar
  app/settings
  app/billing
  app/integrations
  app/integrations/google/callback
  app/organizations
  app/share-links
  app/booking-links
  app/booking-links/new
  app/insights
)

for route in "${ROUTES[@]}"; do
  mkdir -p "${DIST}/${route}"
  cp "$INDEX" "${DIST}/${route}/index.html"
done

echo "Created index.html for ${#ROUTES[@]} SPA routes (200 responses)."
