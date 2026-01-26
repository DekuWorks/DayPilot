#!/bin/bash
# Email Notifications Setup Script for DayPilot
# Run this after getting your Resend API key

echo "📧 DayPilot Email Notifications Setup"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if project is linked
if ! supabase projects list | grep -q "●"; then
    echo "❌ No Supabase project linked. Link your project first:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Supabase CLI found and project is linked"
echo ""

# Get Resend API Key
read -p "Enter your Resend API Key (starts with 're_'): " RESEND_API_KEY

if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ Resend API Key is required"
    exit 1
fi

# Get From Email
read -p "Enter your 'From' email address (e.g., noreply@yourdomain.com or onboarding@resend.dev): " RESEND_FROM_EMAIL

if [ -z "$RESEND_FROM_EMAIL" ]; then
    echo "❌ From email address is required"
    exit 1
fi

echo ""
echo "Setting Supabase secrets..."
echo ""

# Set secrets
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
supabase secrets set RESEND_FROM_EMAIL="$RESEND_FROM_EMAIL"

echo ""
echo "✅ Secrets set successfully!"
echo ""
echo "Next steps:"
echo "1. Test email sending by creating a booking"
echo "2. Set up the reminder cron job (see instructions below)"
echo ""
