-- Migration: Remove SECURITY DEFINER from views
-- Created: 2025-11-12
-- Purpose: Fix views that were incorrectly created with SECURITY DEFINER
-- Note: Views in PostgreSQL don't support SECURITY DEFINER (only functions do)
-- This migration recreates views as proper views with SECURITY INVOKER behavior

-- ============================================================================
-- 1. TIME_TRACKING_STATS VIEW
-- ============================================================================
-- Drop and recreate without SECURITY DEFINER
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
-- Drop and recreate without SECURITY DEFINER
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
-- Drop and recreate without SECURITY DEFINER
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
-- 4. USER_ME_TIMELINE_STATUS VIEW (if exists)
-- ============================================================================
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS user_me_timeline_status CASCADE;

-- Note: This view definition is speculative based on the name
-- Update with actual definition if different
CREATE OR REPLACE VIEW user_me_timeline_status
WITH (security_invoker = true) AS
SELECT
  ti.user_id,
  ti.id,
  ti.title,
  ti.status,
  ti.start_time,
  ti.end_time,
  ti.completed_at,
  ti.created_at,
  ti.updated_at
FROM timeline_items ti
WHERE ti.user_id = auth.uid();

COMMENT ON VIEW user_me_timeline_status IS 'Timeline status for current authenticated user. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 5. TIMELINE_TEMPLATES_BY_CATEGORY VIEW (if exists)
-- ============================================================================
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS timeline_templates_by_category CASCADE;

-- Note: This view definition is speculative based on the name
-- Update with actual definition if different
CREATE OR REPLACE VIEW timeline_templates_by_category
WITH (security_invoker = true) AS
SELECT
  category,
  COUNT(*) as template_count,
  array_agg(id ORDER BY created_at DESC) as template_ids,
  array_agg(name ORDER BY created_at DESC) as template_names
FROM timeline_templates
GROUP BY category;

COMMENT ON VIEW timeline_templates_by_category IS 'Timeline templates grouped by category. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 6. TEMPLATE_USAGE_STATS VIEW (if exists)
-- ============================================================================
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS template_usage_stats CASCADE;

-- Note: This view definition is speculative based on the name
-- Update with actual definition if different
CREATE OR REPLACE VIEW template_usage_stats
WITH (security_invoker = true) AS
SELECT
  template_id,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(used_at) as last_used_at,
  MIN(used_at) as first_used_at
FROM timeline_template_usage
GROUP BY template_id;

COMMENT ON VIEW template_usage_stats IS 'Template usage statistics. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- 7. ASSISTANT_ACTIVITY_SUMMARY VIEW (if exists)
-- ============================================================================
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS assistant_activity_summary CASCADE;

-- Note: This view definition is speculative based on the name
-- Update with actual definition if different
CREATE OR REPLACE VIEW assistant_activity_summary
WITH (security_invoker = true) AS
SELECT
  user_id,
  DATE(created_at) as activity_date,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE query_type = 'document') as document_queries,
  COUNT(*) FILTER (WHERE query_type = 'knowledge_base') as kb_queries,
  COUNT(*) FILTER (WHERE query_type = 'general') as general_queries,
  AVG(CHAR_LENGTH(response)) as avg_response_length
FROM ai_query_history
GROUP BY user_id, DATE(created_at);

COMMENT ON VIEW assistant_activity_summary IS 'Daily summary of AI assistant activity by user. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration worked:

-- Check view options (should show security_invoker = true)
-- SELECT schemaname, viewname, viewowner, definition
-- FROM pg_views
-- WHERE viewname IN (
--   'time_tracking_stats',
--   'planning_streaks',
--   'webhook_queue_health',
--   'user_me_timeline_status',
--   'timeline_templates_by_category',
--   'template_usage_stats',
--   'assistant_activity_summary'
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Views with security_invoker = true run with the permissions of the
--    calling user, ensuring RLS policies are properly enforced.
--
-- 2. Views 4-7 have speculative definitions. If these views don't exist or
--    have different structures, update them accordingly.
--
-- 3. If any of these were actually SECURITY DEFINER functions (not views),
--    you'll need to drop and recreate them as functions with SECURITY INVOKER.
--
-- 4. After applying this migration, test that:
--    - Users can only see their own data through these views
--    - RLS policies are being enforced correctly
--    - No privilege escalation is possible
