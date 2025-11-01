-- Google Calendar Scheduled Sync with pg_cron
-- Created: 2025-11-02
-- Purpose: Set up automatic background sync every 15 minutes for enabled users

-- ============================================================================
-- STEP 1: Enable pg_cron extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- STEP 2: Note about Edge Function
-- ============================================================================

-- The Edge Function (google-calendar-sync-scheduled) has been created
-- in supabase/functions/google-calendar-sync-scheduled/index.ts
--
-- It will:
-- 1. Query calendar_sync_settings for users with enabled=true
-- 2. For each user, call the main google-calendar-sync function
-- 3. Use service role key for authentication

-- ============================================================================
-- STEP 3: Schedule the sync job to run every 15 minutes
-- ============================================================================

-- Remove any existing calendar sync jobs
SELECT cron.unschedule('google-calendar-sync-all-users')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'google-calendar-sync-all-users'
);

-- Note: The actual cron job scheduling needs to be done after setting
-- the required database settings. See STEP 6 below for the schedule command.

-- ============================================================================
-- STEP 4: Create monitoring view for cron jobs
-- ============================================================================

CREATE OR REPLACE VIEW calendar_sync_cron_status AS
SELECT
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%calendar%';

COMMENT ON VIEW calendar_sync_cron_status IS 'Monitor Google Calendar sync cron jobs';

-- Grant access to view
GRANT SELECT ON calendar_sync_cron_status TO authenticated;

-- ============================================================================
-- STEP 5: Create helper function to manually trigger sync for all users
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_calendar_sync_for_all_users()
RETURNS jsonb AS $func$
DECLARE
  result jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Get required settings
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url');
    service_key := current_setting('app.settings.service_role_key');
  EXCEPTION
    WHEN undefined_object THEN
      RAISE EXCEPTION 'Required settings not configured. Run the configuration commands in STEP 6.';
  END;

  -- Call the Edge Function via HTTP
  SELECT content::jsonb INTO result
  FROM http_post(
    supabase_url || '/functions/v1/google-calendar-sync-scheduled',
    jsonb_build_object(
      'sync_type', 'manual',
      'triggered_at', NOW()
    ),
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_key),
      http_header('Content-Type', 'application/json')
    ]
  );

  RETURN result;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_calendar_sync_for_all_users IS 'Manually trigger calendar sync for all users with auto-sync enabled';

-- ============================================================================
-- STEP 6: Configuration Instructions
-- ============================================================================

-- IMPORTANT: Before scheduling the cron job, you must configure these settings:
--
-- Option A: Via Supabase Dashboard SQL Editor, run:
--
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://fskwutnoxbbflzqrphro.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
--
-- Option B: Via command line with psql:
--
-- psql -h db.xxx.supabase.co -U postgres -d postgres -c "ALTER DATABASE postgres SET app.settings.supabase_url = 'https://fskwutnoxbbflzqrphro.supabase.co';"
-- psql -h db.xxx.supabase.co -U postgres -d postgres -c "ALTER DATABASE postgres SET app.settings.service_role_key = 'your-key';"
--
-- After setting the configuration, schedule the cron job by running:
--
-- SELECT cron.schedule(
--   'google-calendar-sync-all-users',
--   '*/15 * * * *',
--   $$ SELECT trigger_calendar_sync_for_all_users(); $$
-- );

COMMENT ON EXTENSION pg_cron IS
  'Scheduled jobs for Google Calendar sync. See migration 20251102000001 for configuration instructions.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to check)
-- ============================================================================

-- Check if cron job is scheduled
-- SELECT * FROM calendar_sync_cron_status;

-- Check recent cron job runs
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname = 'google-calendar-sync-all-users'
-- ) ORDER BY start_time DESC LIMIT 10;

-- Manually trigger the sync function (for testing)
-- SELECT trigger_calendar_sync_for_all_users();

-- View all active sync settings
-- SELECT user_id, enabled, auto_sync_enabled, sync_interval_minutes, last_sync_at
-- FROM calendar_sync_settings
-- WHERE enabled = true
-- ORDER BY last_sync_at DESC;

-- Check if settings are configured
-- SELECT current_setting('app.settings.supabase_url', true) as url,
--        CASE WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL
--             THEN 'configured' ELSE 'not configured' END as service_key_status;
