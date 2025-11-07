# Webhook Cron Job Setup Guide

This guide explains how to set up automated processing of queued Stripe webhook events.

## Problem

The `stripe-webhook` Edge Function receives webhook events from Stripe and queues them in the `webhook_events_queue` table. However, **events will never be processed** unless the `process-stripe-webhooks` function is called regularly.

## Solution Options

Choose ONE of the following methods to automatically process webhook events:

---

## Option 1: Supabase pg_cron (Recommended)

**Pros:** Built into Supabase, no external dependencies
**Cons:** Requires Pro plan or higher

### Setup Steps:

1. Go to Supabase SQL Editor
2. Run the migration:

```sql
-- Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the webhook processor to run every 2 minutes
SELECT cron.schedule(
  'process-stripe-webhooks',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

3. Verify the job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-stripe-webhooks';
```

4. Monitor execution:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-stripe-webhooks')
ORDER BY start_time DESC
LIMIT 10;
```

### To Unschedule (if needed):

```sql
SELECT cron.unschedule('process-stripe-webhooks');
```

---

## Option 2: External Cron Service (Free Alternative)

**Pros:** Works with Supabase free tier
**Cons:** Requires external service setup

### Using cron-job.org (Free):

1. Go to https://cron-job.org/
2. Create a free account
3. Create a new cron job with:
   - **URL:** `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks`
   - **Schedule:** Every 2 minutes
   - **HTTP Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Body:** `{}`

4. Save and activate

### Using GitHub Actions (Free):

1. Create `.github/workflows/process-webhooks.yml`:

```yaml
name: Process Stripe Webhooks

on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call webhook processor
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
```

2. Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub repository secrets

---

## Option 3: Local Development

For testing locally, run this command every few minutes:

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your_key_here"

# Call the function
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
```

Or create a simple bash loop:

```bash
#!/bin/bash
while true; do
  echo "Processing webhooks..."
  curl -X POST \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
  echo "Sleeping for 2 minutes..."
  sleep 120
done
```

---

## Monitoring

### Check Queue Health:

```sql
SELECT
  COUNT(*) FILTER (WHERE NOT processed) as pending_events,
  COUNT(*) FILTER (WHERE processed AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE NOT processed AND retry_count >= 5) as failed_events,
  MAX(created_at) FILTER (WHERE NOT processed) as oldest_pending_event
FROM webhook_events_queue;
```

**Healthy System:**
- `pending_events`: 0-5 (depends on traffic)
- `processed_last_hour`: > 0 (if you had webhook events)
- `failed_events`: 0
- `oldest_pending_event`: < 5 minutes ago

**Problem Signs:**
- `pending_events`: > 20 (queue is backing up)
- `oldest_pending_event`: > 10 minutes ago (cron not running)
- `failed_events`: > 0 (events failing after 5 retries)

### View Failed Events:

```sql
SELECT *
FROM webhook_events_queue
WHERE NOT processed AND retry_count >= 5
ORDER BY created_at DESC;
```

### Manually Process Stuck Events:

If events are stuck, you can manually trigger processing:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
```

---

## Troubleshooting

### Problem: Events never get processed

**Cause:** Cron job not set up or not running

**Fix:**
1. Check if cron job is scheduled (see monitoring queries above)
2. Verify service role key is correct
3. Check Edge Function logs for errors

### Problem: Events fail after 5 retries

**Cause:** Error in webhook processing logic or database

**Fix:**
1. Check `error_message` in `webhook_events_queue` table
2. Review Edge Function logs in Supabase Dashboard
3. Check if table names and field names are correct

### Problem: Cron job runs but events still pending

**Cause:** Edge Function error or timeout

**Fix:**
1. Check Edge Function logs
2. Verify environment variables are set:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Test function manually (see "Manually Process Stuck Events" above)

---

## Testing

### Trigger a test webhook:

```bash
# Using Stripe CLI
stripe trigger customer.subscription.created

# Check if event was queued
SELECT * FROM webhook_events_queue ORDER BY created_at DESC LIMIT 1;

# Wait 2-5 minutes for cron to run

# Check if event was processed
SELECT * FROM webhook_events_queue WHERE processed = true ORDER BY processed_at DESC LIMIT 1;

# Check if subscription was created
SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 1;
```

---

## Recommended Schedule

- **Production:** Every 1-2 minutes (fast processing)
- **Development:** Every 5 minutes (reduce load)
- **Low Traffic:** Every 10 minutes (sufficient for small apps)

**Current setting:** Every 2 minutes (good balance)

---

## Cost Considerations

### Supabase pg_cron:
- Included in Pro plan ($25/month)
- Runs inside your database
- No additional cost per execution

### External Services:
- cron-job.org: Free tier supports 2-minute intervals
- GitHub Actions: 2,000 free minutes/month (enough for ~30 days of 2-minute cron)

### Edge Function Invocations:
- Free tier: 500K invocations/month
- At 2-minute intervals: ~21,600 invocations/month (well under limit)

---

## Next Steps

1. Choose your preferred cron method
2. Set it up following the instructions above
3. Test with `stripe trigger customer.subscription.created`
4. Monitor queue health for 24 hours
5. Verify subscriptions are being created in database

**Status:** ⚠️ **REQUIRED** - Payments will not work until cron job is configured
