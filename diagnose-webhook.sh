#!/bin/bash
# Stripe Webhook Diagnostic Script

echo "=== Stripe Webhook Diagnostics ==="
echo ""

# Check if webhook function exists
echo "1. Checking webhook function deployment..."
if [ -f "supabase/functions/stripe-webhook/index.ts" ]; then
    echo "   ✅ Webhook function file exists"
else
    echo "   ❌ Webhook function file NOT found"
fi

# Check config
echo ""
echo "2. Checking Supabase config..."
if grep -q "stripe-webhook" supabase/config.toml 2>/dev/null; then
    echo "   ✅ Webhook config found in config.toml"
    grep -A 2 "\[functions.stripe-webhook\]" supabase/config.toml
else
    echo "   ❌ Webhook config NOT in config.toml"
fi

echo ""
echo "3. Recent webhook-related commits:"
git log --oneline --grep="webhook\|stripe" -5

echo ""
echo "=== ACTION REQUIRED ==="
echo ""
echo "To complete diagnosis, you need to:"
echo ""
echo "A. Check Supabase Logs:"
echo "   1. Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/logs/edge-functions"
echo "   2. Filter by: 'stripe-webhook'"
echo "   3. Look for errors on Oct 22-28, 2025"
echo ""
echo "B. Check Stripe Webhook Status:"
echo "   1. Go to: https://dashboard.stripe.com/webhooks"
echo "   2. Find webhook: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook"
echo "   3. Check the 'Events sent' and 'Failed' counts"
echo "   4. Click on a failed event to see the exact error"
echo ""
echo "C. Verify Environment Variable:"
echo "   1. Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions"
echo "   2. Check if STRIPE_WEBHOOK_SECRET is set"
echo "   3. Compare with Stripe Dashboard webhook signing secret"
echo ""
echo "D. Common Issues:"
echo "   - Wrong STRIPE_WEBHOOK_SECRET (most common)"
echo "   - Stripe API version mismatch"
echo "   - Function timeout/crash"
echo "   - Database connection issue"
echo ""
