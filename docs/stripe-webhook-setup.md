# Stripe Webhook Setup - In Progress

## Current Status: 95% Complete

### What We've Done
1. ✅ Updated stripe-webhook Edge Function with:
   - CORS headers support
   - Updated Stripe API version to 2025-02-24
   - Proper error handling with JSON responses

2. ✅ Configured Supabase to allow public webhook access:
   - Added `[functions.stripe-webhook]` to `supabase/config.toml`
   - Set `verify_jwt = false` (webhooks use Stripe signature verification instead)

3. ✅ Deployed the webhook function to Supabase:
   - Deployed using `supabase functions deploy stripe-webhook`
   - Function is live at: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook`

4. ✅ Configured Stripe webhook endpoint (Live Mode):
   - URL: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook`
   - Listening to 18 events including:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

5. ✅ Added webhook signing secret to Supabase:
   - Environment variable: `STRIPE_WEBHOOK_SECRET`
   - Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets

6. ✅ Webhook is NOW WORKING:
   - Status changed from "401 Unauthorized" to "Delivery recovered"
   - Latest webhook deliveries are successful (200 OK)

### What's Left to Complete

#### 1. Verify Subscription Data in Database
Run this query in Supabase SQL Editor to confirm subscription was saved:

```sql
SELECT
  id,
  user_id,
  plan_type,
  status,
  trial_start,
  trial_end,
  current_period_end,
  created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 5;
```

Expected result: Should show Pro subscription with 14-day trial ending 2 Nov 2025

#### 2. Test Rate Limiting (100 queries/hour)
- Make 101 AI queries within an hour
- Verify the 101st query is blocked with rate limit message
- Check `usage_tracking` table to see query counts

#### 3. Update Billing UI to Show Active Subscription
Currently the Billing tab doesn't reflect the active subscription. Need to:
- Query `subscriptions` table to get current user's subscription
- Display active plan, trial end date, and subscription status
- Show "Manage Subscription" button instead of "Subscribe" buttons

#### 4. Test Subscription Lifecycle
- Cancel subscription (should update status to "canceled" in DB)
- Update subscription (upgrade/downgrade plans)
- Verify webhooks update database correctly for all state changes

## Files Modified

### `/supabase/functions/stripe-webhook/index.ts`
- Added CORS headers
- Updated API version from 2023-10-16 to 2025-02-24
- Added OPTIONS handler for preflight requests
- Improved error responses with proper headers

### `/supabase/config.toml`
- Added stripe-webhook configuration:
  ```toml
  [functions.stripe-webhook]
  verify_jwt = false
  ```

## Environment Variables Required

### Supabase Edge Functions
- `STRIPE_SECRET_KEY` - Stripe secret key (live mode)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe
- `SUPABASE_URL` - Auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase

## Troubleshooting Log

### Issue 1: "Failed to connect to remote host"
**Problem:** Stripe webhook was pointing to wrong Supabase project URL
**Solution:** Updated webhook URL from `srynrudypvvpmfbuyzhr` to `fskwutnoxbbflzqrphro`

### Issue 2: "401 Unauthorized - Missing authorization header"
**Problem:** Supabase Edge Functions require JWT by default
**Solution:**
- Added `verify_jwt = false` to config.toml
- Webhook uses Stripe signature verification instead of Supabase auth
- Redeployed function with new config

### Issue 3: Webhook not firing
**Problem:** User was in live mode, but we were only checking test mode webhooks
**Solution:** Confirmed webhook endpoint exists in live mode and is configured correctly

## Key Learnings

1. **Stripe has separate webhooks for test and live mode** - Each needs its own endpoint configuration
2. **Supabase encrypts secrets** - The hash you see in the dashboard is normal, not an error
3. **JWT verification must be disabled** for public webhooks - Set `verify_jwt = false` in config.toml
4. **Webhooks fire immediately on trial start** - They don't wait for payment after trial period
5. **API version matters** - Mismatch between code and Stripe can cause signature verification failures

## Next Steps (When Resuming)

1. Run the SQL query to verify subscription data exists
2. Update Billing UI component to show active subscription
3. Test rate limiting functionality
4. Test full subscription lifecycle (cancel, update, etc.)
5. Consider adding subscription status to user context/global state
6. Add user-facing subscription management (cancel, upgrade, downgrade)

## Alternative Simpler Approach (If Needed)

If webhook complexity becomes an issue, consider:
- Use Stripe Customer Portal for all subscription management
- Don't store subscription data in Supabase
- Check subscription status via Stripe API when needed
- Trade-off: Simpler setup but more API calls and less control

## Subscription Flow Summary

**Current Implementation:**
1. User clicks "Subscribe" → creates Stripe checkout session
2. User completes checkout → Stripe fires webhooks
3. Webhook handler saves/updates subscription in Supabase
4. App reads subscription from Supabase database
5. 14-day trial, then A$9.99/month (Starter), A$45/month (Pro), or A$149/month (Business)

**Rate Limiting:**
- 100 queries/hour during trial (abuse prevention only)
- Plan limits: Starter (100/month), Pro (1000/month), Business (unlimited)
- Implemented in `supabase/migrations/20251019_simple_rate_limiting.sql`
- Enforced in `supabase/functions/ai-query/index.ts`
