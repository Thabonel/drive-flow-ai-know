# Stripe Webhook Processor

This Edge Function processes Stripe webhook events that have been queued by the `stripe-webhook` function.

## Purpose

Solves Stripe webhook timeout issues by:
1. `stripe-webhook` immediately returns 200 to Stripe (< 1 second)
2. Events are queued in `webhook_events_queue` table
3. This function processes queued events asynchronously

## Deployment

### 1. Apply Database Migration

```bash
# Apply the webhook_events_queue table migration
supabase db push

# Or manually run the migration:
# supabase/migrations/20251103000000_create_webhook_events_queue.sql
```

### 2. Deploy Both Functions

```bash
# Deploy the updated webhook receiver
supabase functions deploy stripe-webhook

# Deploy the webhook processor
supabase functions deploy process-stripe-webhooks
```

### 3. Set Up Cron Job (Recommended)

**Option A: Supabase Cron (pg_cron)**

Create a cron job to run the processor every minute:

```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'process-stripe-webhooks',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**Option B: External Cron (cron-job.org, etc.)**

Set up a cron job to call:
```
POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

**Option C: Manual Trigger**

You can manually trigger processing:

```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Monitoring

### Check Queue Status

```sql
-- See pending events
SELECT * FROM webhook_events_queue WHERE processed = false;

-- See failed events (retry count > 0)
SELECT * FROM webhook_events_queue WHERE retry_count > 0 ORDER BY created_at DESC;

-- See processing stats
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as pending,
  AVG(retry_count) as avg_retries
FROM webhook_events_queue
GROUP BY event_type;
```

### Check Function Logs

```bash
# View processor logs
supabase functions logs process-stripe-webhooks --limit 50

# View webhook receiver logs
supabase functions logs stripe-webhook --limit 50
```

## Event Processing Flow

```
┌─────────┐       ┌──────────────────┐       ┌─────────────┐
│ Stripe  │──────>│ stripe-webhook   │──────>│ Queue Table │
└─────────┘       │ (returns 200)    │       └─────────────┘
                  └──────────────────┘              │
                                                     │
                  ┌──────────────────┐              │
                  │ process-stripe-  │<─────────────┘
                  │ webhooks (cron)  │
                  └──────────────────┘
                           │
                           v
                  ┌──────────────────┐
                  │ Database Updates │
                  │ (subscriptions,  │
                  │  usage_tracking) │
                  └──────────────────┘
```

## Retry Logic

- Failed events are retried automatically on next cron run
- After 5 failed attempts, events are marked as processed
- Check `error_message` column for failure details

## Cleanup (Optional)

To prevent table bloat, periodically clean up old processed events:

```sql
-- Delete processed events older than 30 days
DELETE FROM webhook_events_queue
WHERE processed = true
  AND processed_at < NOW() - INTERVAL '30 days';
```

You can set this up as a weekly cron job.
