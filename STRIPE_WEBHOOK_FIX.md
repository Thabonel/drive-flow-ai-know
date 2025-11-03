# Stripe Webhook Fix - Deployment Guide

## Problem

Stripe was reporting "**17 requests had other errors**" for the webhook endpoint at:
```
https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook
```

**Root Cause:** The webhook function was performing slow database operations (subscription upserts, usage tracking inserts) **before** returning a 200 response to Stripe. This caused timeouts, and Stripe marked these as failed deliveries.

Stripe requires webhooks to respond with `2xx` status **within seconds**, before any slow processing.

## Solution

Implemented an **async queue-based architecture**:

1. **stripe-webhook** function: Immediately returns 200 to Stripe after queuing event
2. **webhook_events_queue** table: Stores events for async processing
3. **process-stripe-webhooks** function: Processes queued events via cron job

## Deployment Steps

### Step 1: Apply Database Migration

The migration creates the `webhook_events_queue` table.

```bash
cd /Users/thabonel/Code/aiqueryhub

# Apply migration
supabase db push
```

If you encounter migration conflicts, apply manually:

```bash
# Apply the specific migration file
supabase db execute < supabase/migrations/20251103000000_create_webhook_events_queue.sql
```

Or run directly in Supabase SQL Editor:

```sql
-- Copy contents of supabase/migrations/20251103000000_create_webhook_events_queue.sql
-- and execute in the SQL Editor
```

### Step 2: Deploy Updated Functions

```bash
# Deploy the updated stripe-webhook function (now queues events)
supabase functions deploy stripe-webhook

# Deploy the new webhook processor function
supabase functions deploy process-stripe-webhooks
```

### Step 3: Set Up Cron Job

The processor function needs to run periodically to process queued events.

**Recommended: Use Supabase pg_cron (Built-in)**

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Create cron job to process webhooks every minute
SELECT cron.schedule(
  'process-stripe-webhooks',           -- Job name
  '* * * * *',                          -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

**Alternative: External Cron Service**

If you prefer external cron (more reliable for critical workloads):

1. Use a service like:
   - [cron-job.org](https://cron-job.org) (free)
   - GitHub Actions (if you have a repo)
   - Vercel Cron
   - AWS EventBridge

2. Configure to POST every minute:
   ```
   POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
   Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
   ```

### Step 4: Verify Everything Works

#### Test 1: Send Test Webhook from Stripe

```bash
# Install Stripe CLI if not already installed
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Send test event to your webhook
stripe trigger customer.subscription.updated
```

#### Test 2: Check Queue

```sql
-- In Supabase SQL Editor, check if events are being queued
SELECT * FROM webhook_events_queue ORDER BY created_at DESC LIMIT 10;
```

You should see:
- `processed = false` initially
- After ~1 minute, `processed = true`

#### Test 3: Manually Trigger Processor

```bash
# Get your service role key from Supabase Dashboard → Settings → API
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Manually trigger processor
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "processed": 1,
  "errors": 0,
  "total": 1
}
```

#### Test 4: Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Go to "Event deliveries" tab
4. Look for recent events - they should show ✅ with 200 status

### Step 5: Monitor

#### View Function Logs

```bash
# Webhook receiver logs
supabase functions logs stripe-webhook --tail

# Processor logs
supabase functions logs process-stripe-webhooks --tail
```

#### Check Queue Health

```sql
-- Pending events (should be low if cron is running)
SELECT COUNT(*) as pending FROM webhook_events_queue WHERE processed = false;

-- Failed events (retry_count > 0)
SELECT
  event_id,
  event_type,
  retry_count,
  error_message,
  created_at
FROM webhook_events_queue
WHERE retry_count > 0
ORDER BY created_at DESC;

-- Processing stats by event type
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as pending,
  ROUND(AVG(retry_count), 2) as avg_retries
FROM webhook_events_queue
GROUP BY event_type
ORDER BY total DESC;
```

## How It Works

### Before (Problematic)

```
Stripe → stripe-webhook → [DB operations] → return 200 (TIMEOUT!)
                           ↑
                  Slow! Takes 2-5 seconds
```

### After (Fixed)

```
Stripe → stripe-webhook → Queue event → return 200 (Fast! <500ms)
                                 ↓
                           Queue Table
                                 ↓
                    Cron → process-stripe-webhooks → [DB operations]
                    (every minute)
```

## Monitoring & Maintenance

### Clean Up Old Events (Optional)

Prevent table bloat by cleaning up old processed events:

```sql
-- Create weekly cleanup job
SELECT cron.schedule(
  'cleanup-old-webhook-events',
  '0 2 * * 0',  -- Every Sunday at 2 AM
  $$
  DELETE FROM webhook_events_queue
  WHERE processed = true
    AND processed_at < NOW() - INTERVAL '30 days';
  $$
);
```

### View Cron Jobs

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### Disable Cron Job (if needed)

```sql
-- Disable the processor cron
SELECT cron.unschedule('process-stripe-webhooks');
```

## Rollback (If Needed)

If you need to rollback:

1. **Redeploy old stripe-webhook function:**
   ```bash
   git checkout HEAD~1 supabase/functions/stripe-webhook/index.ts
   supabase functions deploy stripe-webhook
   ```

2. **Disable cron job:**
   ```sql
   SELECT cron.unschedule('process-stripe-webhooks');
   ```

3. **Process remaining queued events manually:**
   ```bash
   curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

## Expected Outcome

- ✅ Stripe webhook deliveries show 200 status
- ✅ No more "other errors" emails from Stripe
- ✅ Events processed within 1-2 minutes (depending on cron frequency)
- ✅ System can handle high webhook volume without timeouts

## Troubleshooting

### Events not being processed

```sql
-- Check if cron is running
SELECT * FROM cron.job WHERE jobname = 'process-stripe-webhooks';

-- Manually trigger processor
-- (Use curl command from Step 4 above)
```

### High retry counts

```sql
-- Find events with errors
SELECT event_id, event_type, error_message, retry_count
FROM webhook_events_queue
WHERE retry_count > 2;
```

Check function logs for details:
```bash
supabase functions logs process-stripe-webhooks --limit 100
```

## Files Changed

1. ✅ `supabase/migrations/20251103000000_create_webhook_events_queue.sql` - New migration
2. ✅ `supabase/functions/stripe-webhook/index.ts` - Modified to queue events
3. ✅ `supabase/functions/process-stripe-webhooks/index.ts` - New processor function
4. ✅ `supabase/functions/process-stripe-webhooks/README.md` - Documentation

## Questions?

Check logs first:
```bash
supabase functions logs stripe-webhook
supabase functions logs process-stripe-webhooks
```

Check Stripe Dashboard:
https://dashboard.stripe.com/webhooks
