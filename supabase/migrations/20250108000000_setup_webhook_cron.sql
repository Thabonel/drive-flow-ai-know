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
SELECT cron.schedule(
  'process-stripe-webhooks',  -- job name
  '*/2 * * * *',              -- every 2 minutes
  $$SELECT process_stripe_webhooks()$$
);

-- Alternative: If using pg_net extension directly
-- Uncomment this and comment out the function above:
/*
SELECT cron.schedule(
  'process-stripe-webhooks',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('process-stripe-webhooks');

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
