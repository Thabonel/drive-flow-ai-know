-- ============================================================================
-- FIX FUNCTION SEARCH PATHS - CORRECTED VERSION
-- Run this directly in Supabase SQL Editor
-- ============================================================================
-- This version uses the correct pg_proc.proconfig column
-- ============================================================================

-- Fix all functions by adding search_path
DO $$
DECLARE
  func_name text;
  func_names text[] := ARRAY[
    'get_user_role',
    'log_assistant_action',
    'increment_query_count',
    'validate_magnetic_timeline_continuity',
    'auto_log_timeline_item_changes',
    'create_item_from_template',
    'update_tasks_updated_at',
    'update_magnetic_timeline_updated_at',
    'update_calendar_sync_settings_updated_at',
    'cleanup_orphaned_calendar_sync_data',
    'update_day_templates_updated_at',
    'check_assistant_permission',
    'can_user_access_timeline_item',
    'auto_log_document_actions',
    'setup_default_user_role',
    'calculate_goal_hours_completed',
    'update_goal_hours',
    'update_routine_items_updated_at',
    'is_routine_scheduled_for_day',
    'create_default_routines_for_user',
    'process_stripe_webhooks',
    'track_task_completion',
    'create_default_planning_settings',
    'planning_needed_today',
    'get_current_streak',
    'is_time_slot_available',
    'get_available_slots',
    'create_booking_with_calendar_event',
    'update_updated_at_column',
    'update_webhook_events_queue_updated_at',
    'get_user_teams',
    'is_team_member',
    'has_team_role',
    'is_team_admin',
    'update_teams_updated_at',
    'create_team_settings',
    'add_owner_as_member',
    'get_pending_email_tasks_count',
    'update_sender_pattern',
    'update_email_system_updated_at',
    'get_current_usage',
    'can_use_feature',
    'update_pricing_updated_at',
    'initialize_onboarding',
    'track_milestone',
    'update_feedback_updated_at'
  ];
  fixed_count integer := 0;
  error_count integer := 0;
  skip_count integer := 0;
  func_exists boolean;
  already_has_path boolean;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Fixing function search paths...';
  RAISE NOTICE '==================================================';

  FOREACH func_name IN ARRAY func_names
  LOOP
    BEGIN
      -- Check if function exists
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = func_name
      ) INTO func_exists;

      IF NOT func_exists THEN
        RAISE NOTICE '  Skip: % (not found)', func_name;
        skip_count := skip_count + 1;
        CONTINUE;
      END IF;

      -- Check if it already has search_path set
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = func_name
          AND p.proconfig IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM unnest(p.proconfig) AS config
            WHERE config LIKE 'search_path=%'
          )
      ) INTO already_has_path;

      IF already_has_path THEN
        RAISE NOTICE '  Skip: % (already configured)', func_name;
        skip_count := skip_count + 1;
        CONTINUE;
      END IF;

      -- Use ALTER FUNCTION to set search_path
      EXECUTE format(
        'ALTER FUNCTION public.%I SET search_path = ''''',
        func_name
      );

      RAISE NOTICE '  ✓ Fixed: %', func_name;
      fixed_count := fixed_count + 1;

      -- Small delay to avoid lock contention
      PERFORM pg_sleep(0.01);

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '  ✗ Error: % - %', func_name, SQLERRM;
        error_count := error_count + 1;
    END;
  END LOOP;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  Fixed: % functions', fixed_count;
  RAISE NOTICE '  Skipped: % functions', skip_count;
  RAISE NOTICE '  Errors: % functions', error_count;
  RAISE NOTICE '==================================================';
END $$;

-- Verification
DO $$
DECLARE
  remaining_count integer;
  func_rec record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'VERIFICATION - Functions still without search_path:';
  RAISE NOTICE '==================================================';

  remaining_count := 0;

  FOR func_rec IN
    SELECT
      p.proname as function_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) AS config
          WHERE config LIKE 'search_path=%'
        )
      )
    ORDER BY p.proname
  LOOP
    RAISE NOTICE '  • %', func_rec.function_name;
    remaining_count := remaining_count + 1;
  END LOOP;

  IF remaining_count = 0 THEN
    RAISE NOTICE '  ✓ SUCCESS! All functions have search_path configured!';
  ELSE
    RAISE NOTICE '  ⚠ Still need to fix % functions', remaining_count;
  END IF;

  RAISE NOTICE '==================================================';
END $$;
