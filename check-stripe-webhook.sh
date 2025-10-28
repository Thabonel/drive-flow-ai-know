#!/bin/bash
# Script to check Stripe webhook status via Stripe API
# You need to provide your STRIPE_SECRET_KEY

echo "=== Stripe Webhook Status Checker ==="
echo ""

# Check if STRIPE_SECRET_KEY is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY environment variable not set"
    echo ""
    echo "To use this script:"
    echo "  export STRIPE_SECRET_KEY='sk_live_your_key_here'"
    echo "  ./check-stripe-webhook.sh"
    echo ""
    echo "Or run directly:"
    echo "  STRIPE_SECRET_KEY='sk_live_your_key_here' ./check-stripe-webhook.sh"
    exit 1
fi

echo "✅ STRIPE_SECRET_KEY found"
echo ""

# List webhook endpoints
echo "1. Fetching webhook endpoints..."
WEBHOOK_DATA=$(curl -s https://api.stripe.com/v1/webhook_endpoints \
    -u "$STRIPE_SECRET_KEY:" \
    -G)

# Check for errors
if echo "$WEBHOOK_DATA" | grep -q "error"; then
    echo "❌ Error fetching webhooks:"
    echo "$WEBHOOK_DATA" | jq -r '.error.message' 2>/dev/null || echo "$WEBHOOK_DATA"
    exit 1
fi

echo "✅ Successfully fetched webhook endpoints"
echo ""

# Find our webhook
WEBHOOK_URL="https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook"
WEBHOOK_ID=$(echo "$WEBHOOK_DATA" | jq -r ".data[] | select(.url == \"$WEBHOOK_URL\") | .id" 2>/dev/null)

if [ -z "$WEBHOOK_ID" ]; then
    echo "❌ Webhook endpoint not found: $WEBHOOK_URL"
    echo ""
    echo "Available webhooks:"
    echo "$WEBHOOK_DATA" | jq -r '.data[] | "  - \(.url) (status: \(.status))"' 2>/dev/null
    exit 1
fi

echo "✅ Found webhook: $WEBHOOK_ID"
echo ""

# Get webhook details
echo "2. Fetching webhook details..."
WEBHOOK_DETAILS=$(curl -s "https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID" \
    -u "$STRIPE_SECRET_KEY:")

# Parse details
STATUS=$(echo "$WEBHOOK_DETAILS" | jq -r '.status' 2>/dev/null)
API_VERSION=$(echo "$WEBHOOK_DETAILS" | jq -r '.api_version' 2>/dev/null)
ENABLED=$(echo "$WEBHOOK_DETAILS" | jq -r '.enabled_events | length' 2>/dev/null)

echo "📊 Webhook Status:"
echo "   Status: $STATUS"
echo "   API Version: $API_VERSION"
echo "   Enabled Events: $ENABLED events"
echo "   URL: $WEBHOOK_URL"
echo ""

# Get signing secret (first 10 chars only for security)
SECRET=$(echo "$WEBHOOK_DETAILS" | jq -r '.secret' 2>/dev/null)
if [ "$SECRET" != "null" ] && [ -n "$SECRET" ]; then
    SECRET_PREFIX=$(echo "$SECRET" | cut -c1-10)
    echo "🔑 Signing Secret: ${SECRET_PREFIX}... (first 10 chars)"
    echo ""
    echo "⚠️  IMPORTANT: Copy this full secret to Supabase:"
    echo "   Secret: $SECRET"
    echo "   Set in: Supabase → Settings → Functions → Secrets → STRIPE_WEBHOOK_SECRET"
fi

echo ""
echo "3. Recent event attempts..."

# Get recent events (to check for failures)
EVENTS=$(curl -s "https://api.stripe.com/v1/events?limit=5" \
    -u "$STRIPE_SECRET_KEY:" \
    -G)

echo "Latest 5 events:"
echo "$EVENTS" | jq -r '.data[] | "  \(.created | strftime("%Y-%m-%d %H:%M:%S")) - \(.type)"' 2>/dev/null

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Copy the signing secret shown above"
echo "2. Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions"
echo "3. Update STRIPE_WEBHOOK_SECRET with the full secret"
echo "4. Test by going to Stripe Dashboard → Webhooks → Send test webhook"
echo ""
