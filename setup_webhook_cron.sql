-- ============================================================
-- Stripe Webhook Cron Job Setup
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
-- ============================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Unschedule existing job if it exists (makes this script idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('process-stripe-webhooks')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-stripe-webhooks'
  );
END $$;

-- Step 3: Schedule the webhook processor to run every 2 minutes
-- This will automatically process queued Stripe webhook events
SELECT cron.schedule(
  'process-stripe-webhooks',  -- Job name
  '*/2 * * * *',              -- Run every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Step 4: Create monitoring view for webhook queue health
CREATE OR REPLACE VIEW webhook_queue_health AS
SELECT
  COUNT(*) FILTER (WHERE NOT processed) as pending_events,
  COUNT(*) FILTER (WHERE processed AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE NOT processed AND retry_count >= 5) as failed_events,
  MAX(created_at) FILTER (WHERE NOT processed) as oldest_pending_event,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE processed) as avg_processing_time_seconds
FROM webhook_events_queue;

COMMENT ON VIEW webhook_queue_health IS 'Monitor webhook processing health. Check regularly to ensure cron job is working.';

-- ============================================================
-- VERIFICATION QUERIES (Run these after setup)
-- ============================================================

-- 1. Verify cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'process-stripe-webhooks';

-- 2. Check recent cron executions:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-stripe-webhooks')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- 3. Monitor webhook queue health:
-- SELECT * FROM webhook_queue_health;

-- 4. View pending webhook events:
-- SELECT id, event_type, created_at, retry_count, error_message
-- FROM webhook_events_queue
-- WHERE NOT processed
-- ORDER BY created_at ASC;

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- If you need to unschedule the job:
-- SELECT cron.unschedule('process-stripe-webhooks');

-- If you need to manually trigger processing:
-- (Use curl or similar tool, not SQL)
-- curl -X POST \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
