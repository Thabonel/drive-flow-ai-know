-- ============================================================================
-- FIX BROKEN TRIGGER THAT'S BLOCKING DELETIONS
-- ============================================================================
-- The auto_log_timeline_item_changes trigger references a missing type
-- causing "ERROR: type audit_action_type does not exist"
--
-- Run this BEFORE running STEP 2 (repair and delete)
-- URL: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
-- ============================================================================

-- Drop ALL triggers that depend on the broken function
DROP TRIGGER IF EXISTS auto_log_timeline_item_changes ON timeline_items;
DROP TRIGGER IF EXISTS log_timeline_item_changes ON timeline_items;

-- Drop the broken function with CASCADE (removes all dependent triggers)
DROP FUNCTION IF EXISTS auto_log_timeline_item_changes() CASCADE;

-- Verify triggers are gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All broken triggers removed successfully'
    ELSE '⚠️ Still ' || COUNT(*) || ' triggers remaining'
  END as status
FROM information_schema.triggers
WHERE (trigger_name = 'auto_log_timeline_item_changes'
   OR trigger_name = 'log_timeline_item_changes')
AND event_object_table = 'timeline_items';

-- Verify function is gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Broken function removed successfully'
    ELSE '⚠️ Function still exists'
  END as status
FROM information_schema.routines
WHERE routine_name = 'auto_log_timeline_item_changes';

-- Now you can proceed with STEP 2 to delete the items
SELECT '✅ Ready to run EMERGENCY_FIX_2_REPAIR_AND_DELETE.sql' as next_step;
