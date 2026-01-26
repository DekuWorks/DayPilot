#!/bin/bash

# Script to set Google OAuth secrets in Supabase
# Usage: ./set-google-secrets.sh

echo "🔐 Setting Google OAuth secrets in Supabase..."
echo ""

# Check if linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "⚠️  Not linked to Supabase project."
  echo "First, link your project:"
  echo "  supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "You can find your project ref in your Supabase dashboard URL:"
  echo "  https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
  echo ""
  exit 1
fi

# Prompt for values
read -p "Enter your Google Client ID: " CLIENT_ID
read -sp "Enter your Google Client Secret: " CLIENT_SECRET
echo ""
read -p "Enter your frontend URL [https://daypilot.co]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-https://daypilot.co}

# Set secrets
echo ""
echo "Setting secrets..."
supabase secrets set GOOGLE_CLIENT_ID="$CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="$CLIENT_SECRET"
supabase secrets set FRONTEND_URL="$FRONTEND_URL"

echo ""
echo "✅ Secrets set! Verifying..."
supabase secrets list

echo ""
echo "📦 Next step: Deploy Edge Functions"
echo "  supabase functions deploy google-oauth"
echo "  supabase functions deploy google-discover"
echo "  supabase functions deploy google-sync"
