# Fix Stripe Webhook - Step by Step

## Diagnosis Results

✅ Webhook endpoint is ACCESSIBLE: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook`
✅ Function is DEPLOYED and responding correctly
✅ Config is correct (`verify_jwt = false` in config.toml)

❌ **PROBLEM: Signature verification is likely failing**

This means STRIPE_WEBHOOK_SECRET in Supabase doesn't match Stripe's signing secret.

---

## Fix Steps (5 minutes)

### Step 1: Get Signing Secret from Stripe

1. Go to: **https://dashboard.stripe.com/webhooks** (make sure you're in LIVE mode!)
2. Find your webhook endpoint: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook`
3. Click on it
4. Click **"Signing secret"** → **"Reveal"**
5. Copy the secret (starts with `whsec_`)

### Step 2: Update Secret in Supabase

1. Go to: **https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions**
2. Scroll to **"Secrets"** section
3. Look for `STRIPE_WEBHOOK_SECRET`
   - If it exists: Click **"Edit"** and replace with the secret from Step 1
   - If missing: Click **"Add new secret"**, name it `STRIPE_WEBHOOK_SECRET`, paste the secret
4. Click **"Save"**

### Step 3: Verify the Fix

Wait a few minutes, then:

1. Go back to **Stripe Dashboard → Webhooks**
2. Click your webhook endpoint
3. Click **"Send test webhook"**
4. Choose event: `customer.subscription.created`
5. Click **"Send test webhook"**

**Expected result**: Status should show `200 OK` (success)

If still failing:
- Check Supabase logs: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/logs/edge-functions
- Filter by `stripe-webhook`
- Look for the latest error message

---

## Alternative: Disable Webhook Temporarily

If you're not actively using subscriptions yet and need to stop the error emails:

1. Go to: **https://dashboard.stripe.com/webhooks**
2. Click your webhook
3. Click **"..."** (three dots) → **"Disable endpoint"**

⚠️ **Warning**: Disabling means:
- You won't get subscription renewal notifications
- Failed payment updates won't be processed
- Cancellations won't be tracked
- Only do this if you're still in testing phase

---

## Why This Happened

Looking at your git history, you switched from session-based verification to webhook-based on Oct 25 (commit `73103ac`). The webhook likely worked initially but either:

1. The signing secret was regenerated in Stripe
2. The secret wasn't properly set in Supabase
3. The webhook was created in test mode but you're now in live mode

---

## Test After Fix

After updating the secret, test a full subscription flow:

```bash
# From your terminal
cd /Users/thabonel/Code/aiqueryhub

# Check webhook status
./diagnose-webhook.sh

# Test the endpoint (should still say "Missing Stripe signature")
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Then test in Stripe Dashboard by sending a test webhook event.

---

## Need Help?

If after following these steps it still fails:

1. Share the **exact error message** from Supabase logs
2. Check if the secret in Supabase starts with `whsec_`
3. Verify you're using the **LIVE mode** webhook secret, not test mode

