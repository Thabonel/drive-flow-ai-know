-- ============================================================================
-- STRIPE WEBHOOK MONITORING QUERIES
-- ============================================================================
-- Run these in Supabase SQL Editor to monitor webhook health
-- ============================================================================

-- Query 1: Queue Health Overview
-- Shows current state of webhook processing
SELECT
  COUNT(*) FILTER (WHERE processed = false) as pending_count,
  COUNT(*) FILTER (WHERE processed = true) as processed_count,
  COUNT(*) FILTER (WHERE retry_count > 0 AND retry_count < 5) as retrying_count,
  COUNT(*) FILTER (WHERE retry_count >= 5) as failed_count,
  ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE processed = false)))/60, 1) as oldest_pending_minutes,
  MAX(processed_at) as last_processed_at
FROM webhook_events_queue;

-- Expected Results:
-- pending_count: 0-5 (healthy), 5-20 (warning), >20 (critical)
-- failed_count: 0 (healthy), >0 (investigate)
-- oldest_pending_minutes: <10 (healthy), 10-30 (warning), >30 (critical)


-- Query 2: Recent Failed Events
-- Shows events that failed processing
SELECT
  id,
  event_id,
  event_type,
  retry_count,
  error_message,
  created_at,
  AGE(NOW(), created_at) as age
FROM webhook_events_queue
WHERE retry_count >= 3 OR (processed = false AND created_at < NOW() - INTERVAL '30 minutes')
ORDER BY created_at DESC
LIMIT 20;

-- Action Required if results:
-- - Check error_message for root cause
-- - Verify user_subscriptions table exists
-- - Check Supabase function logs


-- Query 3: Processing Performance (Last 24 Hours)
-- Shows how fast webhooks are being processed
SELECT
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as events_processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 1) as avg_processing_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_processing_seconds
FROM webhook_events_queue
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Expected Results:
-- avg_processing_seconds: <300 (5 min) is healthy
-- max_processing_seconds: <600 (10 min) is acceptable


-- Query 4: Event Type Distribution
-- Shows which webhook types are being received
SELECT
  event_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE retry_count >= 5) as failed
FROM webhook_events_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY total DESC;

-- Common Event Types:
-- customer.subscription.created
-- customer.subscription.updated
-- customer.subscription.deleted
-- invoice.payment_succeeded
-- invoice.payment_failed


-- Query 5: Cron Job Status (Check if processor is running)
-- Verifies that background processing is happening
SELECT
  MAX(processed_at) as last_processing_run,
  AGE(NOW(), MAX(processed_at)) as time_since_last_run,
  CASE
    WHEN MAX(processed_at) > NOW() - INTERVAL '10 minutes' THEN '✅ HEALTHY'
    WHEN MAX(processed_at) > NOW() - INTERVAL '30 minutes' THEN '⚠️  WARNING'
    ELSE '🔴 CRITICAL - Processor not running'
  END as status
FROM webhook_events_queue
WHERE processed = true;

-- Expected: last_processing_run within last 5-10 minutes
-- If CRITICAL: Check cron job is set up (see SETUP_WEBHOOK_CRON.md)


-- ============================================================================
-- MANUAL PROCESSING COMMANDS
-- ============================================================================
-- Use these to manually trigger webhook processing if needed

-- Command 1: Trigger processor manually
-- Copy this URL and paste in browser (replace YOUR_SERVICE_ROLE_KEY):
-- https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
-- Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY

-- Command 2: Reset stuck events (use with caution!)
-- Resets retry count for events stuck in retry loop
-- UPDATE webhook_events_queue
-- SET retry_count = 0, error_message = NULL
-- WHERE retry_count >= 5 AND event_type IN ('customer.subscription.created', 'customer.subscription.updated');

-- Command 3: View specific event details
-- SELECT event_data FROM webhook_events_queue WHERE event_id = 'evt_xxxxx';


-- ============================================================================
-- ALERTS SETUP
-- ============================================================================
-- Set up these as scheduled queries to get alerts

-- Alert 1: Queue Depth Alert
-- Run every 10 minutes, alert if > 10 pending
DO $$
DECLARE
  pending_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM webhook_events_queue
  WHERE processed = false;

  IF pending_count > 10 THEN
    RAISE WARNING 'ALERT: % pending webhooks in queue', pending_count;
    -- TODO: Send to monitoring service
  END IF;
END $$;


-- Alert 2: Failed Events Alert
-- Run every hour, alert if any events failed 5 times
DO $$
DECLARE
  failed_count INT;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM webhook_events_queue
  WHERE retry_count >= 5;

  IF failed_count > 0 THEN
    RAISE WARNING 'ALERT: % webhooks failed after 5 retries', failed_count;
    -- TODO: Send to monitoring service
  END IF;
END $$;


-- Alert 3: Processor Down Alert
-- Run every 15 minutes, alert if no processing in last 15 min
DO $$
DECLARE
  last_run TIMESTAMPTZ;
BEGIN
  SELECT MAX(processed_at) INTO last_run
  FROM webhook_events_queue
  WHERE processed = true;

  IF last_run < NOW() - INTERVAL '15 minutes' THEN
    RAISE WARNING 'ALERT: Webhook processor hasnt run since %', last_run;
    -- TODO: Send to monitoring service
  END IF;
END $$;


-- ============================================================================
-- DIAGNOSTIC QUERIES
-- ============================================================================

-- Diagnostic 1: Check if tables exist
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE tablename IN ('webhook_events_queue', 'user_subscriptions', 'usage_tracking')
ORDER BY tablename;

-- Diagnostic 2: Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  roles
FROM pg_policies
WHERE tablename = 'webhook_events_queue';

-- Diagnostic 3: Sample recent subscription updates
SELECT
  stripe_subscription_id,
  status,
  plan_type,
  current_period_start,
  current_period_end,
  updated_at
FROM user_subscriptions
ORDER BY updated_at DESC
LIMIT 10;


-- ============================================================================
-- PERFORMANCE TUNING
-- ============================================================================

-- Add index for faster queue processing
CREATE INDEX IF NOT EXISTS idx_webhook_queue_unprocessed
ON webhook_events_queue(created_at)
WHERE processed = false;

-- Add index for event_id lookups (idempotency)
CREATE INDEX IF NOT EXISTS idx_webhook_queue_event_id
ON webhook_events_queue(event_id);


-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- Clean up old processed events (keep last 30 days)
-- RUN THIS MONTHLY to prevent table bloat
-- DELETE FROM webhook_events_queue
-- WHERE processed = true
-- AND processed_at < NOW() - INTERVAL '30 days';
