#!/bin/bash
# Update FROM email to use your verified domain

echo "📧 Updating DayPilot FROM Email"
echo "================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "Current FROM email: onboarding@resend.dev (test domain)"
echo ""
read -p "Enter your verified domain email (e.g., noreply@daypilot.co): " NEW_FROM_EMAIL

if [ -z "$NEW_FROM_EMAIL" ]; then
    echo "❌ Email address is required"
    exit 1
fi

# Validate email format (basic check)
if [[ ! "$NEW_FROM_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "❌ Invalid email format"
    exit 1
fi

echo ""
echo "Updating RESEND_FROM_EMAIL secret..."
supabase secrets set RESEND_FROM_EMAIL="$NEW_FROM_EMAIL"

echo ""
echo "✅ FROM email updated to: $NEW_FROM_EMAIL"
echo ""
echo "Note: The change takes effect immediately for new emails."
echo "      Existing Edge Functions will use the new value on their next invocation."
echo ""
