-- ============================================================================
-- STANDALONE FIX FOR SECURITY DEFINER VIEWS
-- Run this directly in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TIME_TRACKING_STATS VIEW
-- ============================================================================
DROP VIEW IF EXISTS time_tracking_stats CASCADE;

CREATE OR REPLACE VIEW time_tracking_stats
WITH (security_invoker = true) AS
SELECT
  user_id,
  task_type,
  COUNT(*) as task_count,
  AVG(actual_duration_minutes) as avg_actual_minutes,
  AVG(estimated_duration_minutes) as avg_estimated_minutes,
  AVG(overrun_minutes) as avg_overrun_minutes,
  AVG(accuracy_percent) as avg_accuracy_percent,
  STDDEV(actual_duration_minutes) as stddev_actual_minutes
FROM time_tracking
WHERE estimated_duration_minutes IS NOT NULL
GROUP BY user_id, task_type;

COMMENT ON VIEW time_tracking_stats IS 'Aggregated time tracking statistics by user and task type. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 2. PLANNING_STREAKS VIEW
-- ============================================================================
DROP VIEW IF EXISTS planning_streaks CASCADE;

CREATE OR REPLACE VIEW planning_streaks
WITH (security_invoker = true) AS
WITH daily_sessions AS (
  SELECT
    user_id,
    planning_date,
    completed_at IS NOT NULL as completed,
    LAG(planning_date) OVER (PARTITION BY user_id ORDER BY planning_date) as prev_date
  FROM daily_planning_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY user_id, planning_date
),
streak_groups AS (
  SELECT
    user_id,
    planning_date,
    completed,
    SUM(CASE
      WHEN prev_date IS NULL OR planning_date - prev_date > 1 THEN 1
      ELSE 0
    END) OVER (PARTITION BY user_id ORDER BY planning_date) as streak_group
  FROM daily_sessions
),
streak_calculations AS (
  SELECT
    user_id,
    streak_group,
    MIN(planning_date) as streak_start,
    MAX(planning_date) as streak_end,
    COUNT(*) as streak_length
  FROM streak_groups
  WHERE completed = true
  GROUP BY user_id, streak_group
)
SELECT
  user_id,
  MAX(streak_length) as longest_streak,
  (
    SELECT streak_length
    FROM streak_calculations sc2
    WHERE sc2.user_id = sc.user_id
      AND sc2.streak_end = (SELECT MAX(planning_date) FROM daily_planning_sessions WHERE user_id = sc.user_id AND completed_at IS NOT NULL)
    LIMIT 1
  ) as current_streak,
  COUNT(DISTINCT streak_group) as total_streaks
FROM streak_calculations sc
GROUP BY user_id;

COMMENT ON VIEW planning_streaks IS 'Calculates planning streaks for gamification. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 3. WEBHOOK_QUEUE_HEALTH VIEW
-- ============================================================================
DROP VIEW IF EXISTS webhook_queue_health CASCADE;

CREATE OR REPLACE VIEW webhook_queue_health
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE NOT processed) as pending_events,
  COUNT(*) FILTER (WHERE processed AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE NOT processed AND retry_count >= 5) as failed_events,
  MAX(created_at) FILTER (WHERE NOT processed) as oldest_pending_event,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE processed) as avg_processing_time_seconds
FROM webhook_events_queue;

COMMENT ON VIEW webhook_queue_health IS 'Monitor webhook processing health. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 4-7. OTHER VIEWS (if they exist)
-- ============================================================================
-- These views may or may not exist in your database. If they don't exist, these commands will silently succeed.

DROP VIEW IF EXISTS user_me_timeline_status CASCADE;
DROP VIEW IF EXISTS timeline_templates_by_category CASCADE;
DROP VIEW IF EXISTS template_usage_stats CASCADE;
DROP VIEW IF EXISTS assistant_activity_summary CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that views were recreated correctly
DO $$
DECLARE
  view_count integer;
BEGIN
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE viewname IN (
    'time_tracking_stats',
    'planning_streaks',
    'webhook_queue_health'
  );

  RAISE NOTICE 'Successfully recreated % views with SECURITY INVOKER', view_count;
END $$;
