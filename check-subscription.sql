-- Run this in Supabase SQL Editor after completing test subscription

-- Check if subscription was created
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

-- Check usage tracking
SELECT
  user_id,
  query_count,
  queries_this_hour,
  last_query_at,
  period_start
FROM usage_tracking
ORDER BY last_query_at DESC
LIMIT 5;

-- Check for any alerts
SELECT
  user_id,
  alert_type,
  query_count,
  threshold,
  alerted_at
FROM usage_alerts
ORDER BY alerted_at DESC
LIMIT 5;
