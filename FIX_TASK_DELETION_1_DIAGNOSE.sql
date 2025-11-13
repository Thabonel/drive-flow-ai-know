-- ============================================================================
-- DIAGNOSE UNDELETABLE TASK
-- ============================================================================
-- Run this in Supabase SQL Editor to find the problem task
-- URL: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
-- ============================================================================

-- Show ALL tasks for this user
SELECT
  id,
  user_id,
  title,
  description,
  planned_duration_minutes,
  priority,
  color,
  tags,
  is_template,
  parent_task_id,
  created_at,
  updated_at
FROM tasks
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Check for NULL values in NOT NULL columns
SELECT
  id,
  title,
  CASE WHEN user_id IS NULL THEN 'NULL!' ELSE 'OK' END as user_id_status,
  CASE WHEN title IS NULL THEN 'NULL!' ELSE 'OK' END as title_status,
  CASE WHEN planned_duration_minutes IS NULL THEN 'NULL!' ELSE 'OK' END as planned_duration_status,
  CASE WHEN planned_duration_minutes <= 0 THEN 'INVALID! Must be > 0' ELSE 'OK' END as duration_check,
  CASE WHEN priority IS NULL THEN 'NULL!' ELSE 'OK' END as priority_status,
  CASE WHEN color IS NULL THEN 'NULL!' ELSE 'OK' END as color_status,
  CASE WHEN tags IS NULL THEN 'NULL!' ELSE 'OK' END as tags_status,
  CASE WHEN is_template IS NULL THEN 'NULL!' ELSE 'OK' END as is_template_status,
  CASE WHEN created_at IS NULL THEN 'NULL!' ELSE 'OK' END as created_at_status,
  CASE WHEN updated_at IS NULL THEN 'NULL!' ELSE 'OK' END as updated_at_status
FROM tasks
WHERE user_id = auth.uid();

-- Check for orphaned parent_task_id references
SELECT
  t.id,
  t.title,
  t.parent_task_id,
  pt.id as parent_exists,
  CASE
    WHEN t.parent_task_id IS NOT NULL AND pt.id IS NULL THEN 'ORPHANED! Parent deleted'
    ELSE 'OK'
  END as parent_check
FROM tasks t
LEFT JOIN tasks pt ON t.parent_task_id = pt.id
WHERE t.user_id = auth.uid();

-- Summary
SELECT
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE is_template = true) as template_tasks,
  COUNT(*) FILTER (WHERE is_template = false) as regular_tasks,
  'Diagnostic complete' as status
FROM tasks
WHERE user_id = auth.uid();
