# Stripe Webhook Hardening Report
## Analysis of Failures & Solutions

Generated: 2025-11-03
Status: 🔴 CRITICAL ISSUES FOUND

---

## 🚨 Critical Issues Identified

### Issue #1: **Table Name Mismatch** (CRITICAL)
**Severity:** 🔴 CRITICAL - Causes 100% webhook processing failure

**Problem:**
```typescript
// Code references (WRONG):
await supabase.from("subscriptions")

// Actual table name (CORRECT):
user_subscriptions
```

**Impact:**
- ALL subscription webhooks fail silently
- Database operations return errors
- Subscriptions don't get created/updated
- Users don't get access to paid features

**Evidence:**
- Migration file: `20251102000015_create_pricing_and_usage_tracking.sql`
- Creates: `user_subscriptions` (NOT `subscriptions`)
- Processor code references wrong table name 8 times

**Fix Required:**
Replace all instances of `.from("subscriptions")` with `.from("user_subscriptions")`

---

### Issue #2: **Missing Cron Trigger** (HIGH)
**Severity:** 🟠 HIGH - Events queue up but never process

**Problem:**
- `process-stripe-webhooks` function exists but never runs
- No cron job configured to trigger it
- Events accumulate in queue indefinitely

**Impact:**
- Webhooks accepted but never processed
- Users' subscription status never updates
- Billing issues go undetected

**Fix Required:**
Set up Supabase Edge Function cron trigger:
```bash
supabase functions schedule create process-webhooks \
  --schedule "*/5 * * * *" \
  --function process-stripe-webhooks
```

Or use `pg_cron` in database:
```sql
SELECT cron.schedule(
  'process-stripe-webhooks',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);
```

---

### Issue #3: **No Health Checks** (MEDIUM)
**Severity:** 🟡 MEDIUM - Can't detect failures proactively

**Problem:**
- No monitoring of queue depth
- No alerts for failed events
- No visibility into processing delays

**Fix Required:**
Add monitoring query:
```sql
-- Check queue health
SELECT
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE retry_count >= 5) as failed,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  MAX(created_at) FILTER (WHERE processed = false) as oldest_pending
FROM webhook_events_queue;
```

---

### Issue #4: **Missing Metadata Validation** (MEDIUM)
**Severity:** 🟡 MEDIUM - Causes silent failures

**Problem:**
```typescript
const userId = subscription.metadata.user_id;
const planType = subscription.metadata.plan_type;

if (!userId) {
  console.error("No user_id in subscription metadata");
  return;  // ❌ Silently fails - event marked as processed
}
```

**Impact:**
- If Stripe subscription doesn't have metadata, event is lost
- No retry, no alert, no recovery
- User doesn't get access

**Fix Required:**
- Throw error instead of returning (triggers retry)
- Add fallback to fetch user from customer_id
- Alert on metadata issues

---

### Issue #5: **No Idempotency in Processor** (LOW)
**Severity:** 🟢 LOW - Could cause duplicate processing

**Problem:**
- Webhook receiver has idempotency (duplicate event_id check)
- Processor doesn't check if subscription already processed
- Could update database multiple times for same event

**Fix Required:**
Add idempotency check before processing

---

## 📊 Failure Analysis

### Why 17 Webhooks Failed

**Root Cause Chain:**
1. Stripe sends webhook → ✅ Received
2. Signature verified → ✅ Passed
3. Event queued → ✅ Queued in `webhook_events_queue`
4. Return 200 to Stripe → ✅ Stripe happy
5. Background processor tries to run → ❌ **NEVER RUNS** (no cron)
6. OR if manually triggered → ❌ **FAILS** (table name mismatch)
7. Events sit in queue forever → ❌ **NEVER PROCESSED**

**Evidence from Error Message:**
```
ERROR: 42710: policy "Service role can manage webhook events"
for table "webhook_events_queue" already exists
```

This suggests migration was run multiple times (maybe manually via SQL editor), indicating debugging attempts.

---

## 🛡️ Hardening Strategy

### Phase 1: Critical Fixes (Deploy Immediately)

1. **Fix Table Names**
   - File: `supabase/functions/process-stripe-webhooks/index.ts`
   - Change: `subscriptions` → `user_subscriptions` (8 occurrences)

2. **Set Up Cron Job**
   - Schedule: Every 5 minutes
   - Function: `process-stripe-webhooks`
   - Method: Supabase Edge Function schedule OR pg_cron

3. **Add Error Alerts**
   - Alert if queue depth > 10
   - Alert if event older than 30 minutes unprocessed
   - Alert if retry_count >= 3

### Phase 2: Validation Improvements

4. **Metadata Validation**
   - Check for user_id in metadata
   - If missing, lookup via customer_id
   - Throw error to trigger retry

5. **Environment Variable Checks**
   - Validate all env vars on startup
   - Fail fast if missing
   - Log configuration status

### Phase 3: Monitoring & Observability

6. **Queue Health Dashboard**
   - Real-time queue depth
   - Processing rate
   - Error rate
   - Oldest unprocessed event age

7. **Stripe Event Logging**
   - Log all event types received
   - Track processing duration
   - Identify slow operations

8. **Dead Letter Queue**
   - Move events that fail 5+ times to DLQ
   - Manual review process
   - Reprocessing capability

---

## 🧪 Testing Plan

### Test 1: End-to-End Webhook Flow

```bash
# Send test webhook from Stripe CLI
stripe trigger customer.subscription.created

# Expected:
# 1. Event appears in webhook_events_queue (processed=false)
# 2. Within 5 minutes, processed=true
# 3. user_subscriptions table updated
# 4. usage_tracking initialized
```

### Test 2: Failure Scenarios

```bash
# Test missing metadata
# Test invalid user_id
# Test database connection loss
# Test duplicate events
# Test signature verification
```

### Test 3: Performance

```bash
# Send 100 webhooks rapidly
# Measure queue drain time
# Check for dropped events
# Verify idempotency
```

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Back up `webhook_events_queue` table
- [ ] Document current queue state
- [ ] Notify team of deployment window

### Deployment Steps
1. [ ] Fix table name references in processor
2. [ ] Deploy updated `process-stripe-webhooks` function
3. [ ] Set up cron job (5-minute interval)
4. [ ] Verify cron is triggering
5. [ ] Monitor first few processing runs
6. [ ] Check queue draining

### Post-Deployment
- [ ] Process any backlog in queue
- [ ] Verify new webhooks process within 5 minutes
- [ ] Set up monitoring alerts
- [ ] Test with Stripe CLI
- [ ] Document new workflow

---

## 🔍 Monitoring Queries

### Queue Health Check
```sql
SELECT
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE processed = true AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE retry_count > 0) as retried,
  COUNT(*) FILTER (WHERE retry_count >= 5) as failed,
  EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE processed = false)))/60 as oldest_pending_minutes
FROM webhook_events_queue;
```

### Failed Events
```sql
SELECT
  id,
  event_id,
  event_type,
  retry_count,
  error_message,
  created_at,
  AGE(NOW(), created_at) as age
FROM webhook_events_queue
WHERE retry_count >= 5 OR (processed = false AND created_at < NOW() - INTERVAL '30 minutes')
ORDER BY created_at DESC;
```

### Processing Rate
```sql
SELECT
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as processed,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM webhook_events_queue
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 🚀 Quick Fix Script

See: `STRIPE_WEBHOOK_QUICK_FIX.sql`

This script:
1. Checks for stuck events in queue
2. Provides commands to manually process them
3. Shows queue health metrics

---

## 📞 Escalation

**If webhooks still failing after fixes:**
1. Check Supabase function logs
2. Verify environment variables are set
3. Test signature verification with Stripe CLI
4. Check database permissions for service role
5. Contact Supabase support for Edge Function cron issues

**Stripe Dashboard:**
- https://dashboard.stripe.com/webhooks
- Check "Recent events" for delivery status
- Review webhook endpoint configuration

**Supabase Dashboard:**
- https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/functions
- Check function logs for `stripe-webhook` and `process-stripe-webhooks`

---

## ✅ Success Criteria

Webhook system is healthy when:
- ✅ All new webhooks processed within 5 minutes
- ✅ Queue depth stays below 5 events
- ✅ Zero events with retry_count >= 5
- ✅ 100% of subscription events update database correctly
- ✅ No events older than 10 minutes unprocessed

---

## 📚 References

- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Supabase Edge Function Cron](https://supabase.com/docs/guides/functions/schedule-functions)
- [Handling Webhook Failures](https://stripe.com/docs/webhooks/best-practices#event-failures)
