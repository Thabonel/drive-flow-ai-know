-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the webhook processor Edge Function
CREATE OR REPLACE FUNCTION process_stripe_webhooks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  response text;
BEGIN
  -- Get Supabase URL and service role key from vault or config
  -- Note: In production, these should be stored securely
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Call the Edge Function using HTTP extension (if available)
  -- This will be replaced with actual implementation based on your setup
  RAISE NOTICE 'Processing webhook queue...';

  -- Alternative: Use pg_net extension if available
  -- SELECT net.http_post(
  --   url := supabase_url || '/functions/v1/process-stripe-webhooks',
  --   headers := jsonb_build_object('Authorization', 'Bearer ' || service_role_key),
  --   body := '{}'::jsonb
  -- );
END;
$$;

-- Schedule the webhook processor to run every 2 minutes
-- This processes queued Stripe webhook events
-- Note: To enable cron scheduling, manually run in Supabase SQL Editor:
--
-- DO $$
-- BEGIN
--   PERFORM cron.schedule(
--     'process-stripe-webhooks',
--     '*/2 * * * *',
--     $$SELECT process_stripe_webhooks()$$
--   );
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
-- END;
-- $$;

-- View scheduled jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('process-stripe-webhooks');

-- Monitor webhook queue health
CREATE OR REPLACE VIEW webhook_queue_health AS
SELECT
  COUNT(*) FILTER (WHERE NOT processed) as pending_events,
  COUNT(*) FILTER (WHERE processed AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE NOT processed AND retry_count >= 5) as failed_events,
  MAX(created_at) FILTER (WHERE NOT processed) as oldest_pending_event,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE processed) as avg_processing_time_seconds
FROM webhook_events_queue;

COMMENT ON VIEW webhook_queue_health IS 'Monitor webhook processing health. Check regularly to ensure cron job is working.';
