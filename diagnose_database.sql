-- ============================================================================
-- DATABASE DIAGNOSTICS - Find problematic views and tables
-- Run this in Supabase SQL Editor to see what exists
-- ============================================================================

-- 1. List all views in public schema
SELECT
  'VIEWS' as type,
  schemaname,
  viewname as name,
  CASE
    WHEN definition LIKE '%timeline_template_usage%' THEN 'REFERENCES timeline_template_usage'
    WHEN definition LIKE '%security_invoker%' THEN 'Has security_invoker'
    ELSE 'Unknown'
  END as notes
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 2. Check if timeline_template_usage table exists
SELECT
  'TABLES' as type,
  schemaname,
  tablename as name,
  'Table exists' as notes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%template%'
ORDER BY tablename;

-- 3. Find views that reference non-existent tables
SELECT
  v.viewname,
  v.definition
FROM pg_views v
WHERE v.schemaname = 'public'
  AND (
    v.definition LIKE '%timeline_template_usage%'
    OR v.definition LIKE '%timeline_templates_by_category%'
    OR v.definition LIKE '%template_usage_stats%'
  );

-- 4. Check which of the 7 problematic views still exist
SELECT
  viewname,
  'EXISTS' as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'time_tracking_stats',
    'planning_streaks',
    'webhook_queue_health',
    'user_me_timeline_status',
    'timeline_templates_by_category',
    'template_usage_stats',
    'assistant_activity_summary'
  )
ORDER BY viewname;
