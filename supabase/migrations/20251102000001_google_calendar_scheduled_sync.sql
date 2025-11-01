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
-- STEP 2: Create Edge Function wrapper for scheduled sync
-- ============================================================================

-- Note: The actual Edge Function (google-calendar-sync-scheduled) will be created
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
SELECT cron.unschedule('google-calendar-sync-all-users');

-- Schedule new job (every 15 minutes)
SELECT cron.schedule(
  'google-calendar-sync-all-users',
  '*/15 * * * *', -- Cron expression: every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/google-calendar-sync-scheduled',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'sync_type', 'scheduled',
        'triggered_at', NOW()
      )
    ) as request_id;
  $$
);

-- ============================================================================
-- STEP 4: Create function to update sync intervals dynamically
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calendar_sync_schedule()
RETURNS void AS $$
DECLARE
  most_common_interval INTEGER;
BEGIN
  -- Find the most common sync interval among active users
  SELECT sync_interval_minutes INTO most_common_interval
  FROM calendar_sync_settings
  WHERE enabled = true AND auto_sync_enabled = true
  GROUP BY sync_interval_minutes
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- If no interval found, default to 15 minutes
  IF most_common_interval IS NULL THEN
    most_common_interval := 15;
  END IF;

  -- Reschedule the cron job with new interval
  PERFORM cron.unschedule('google-calendar-sync-all-users');

  PERFORM cron.schedule(
    'google-calendar-sync-all-users',
    '*/' || most_common_interval || ' * * * *',
    $$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/google-calendar-sync-scheduled',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'sync_type', 'scheduled',
          'triggered_at', NOW()
        )
      ) as request_id;
    $$
  );

  RAISE NOTICE 'Calendar sync schedule updated to run every % minutes', most_common_interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_calendar_sync_schedule IS 'Updates the pg_cron schedule based on most common user sync interval preference';

-- ============================================================================
-- STEP 5: Create trigger to update schedule when settings change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_sync_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update schedule if sync_interval_minutes changed
  IF (TG_OP = 'UPDATE' AND OLD.sync_interval_minutes != NEW.sync_interval_minutes)
     OR (TG_OP = 'INSERT' AND NEW.enabled = true) THEN
    -- Call update function in background (don't block the transaction)
    PERFORM update_calendar_sync_schedule();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_schedule_updater ON calendar_sync_settings;
CREATE TRIGGER sync_schedule_updater
  AFTER INSERT OR UPDATE ON calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sync_schedule();

-- ============================================================================
-- STEP 6: Set required app settings for pg_cron
-- ============================================================================

-- Note: These need to be set via SQL or Supabase Dashboard:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- For now, add helpful comments:
COMMENT ON EXTENSION pg_cron IS
  'Scheduled jobs for Google Calendar sync. Requires app.settings.supabase_url and app.settings.service_role_key to be configured.';

-- ============================================================================
-- STEP 7: Create monitoring view for cron jobs
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
-- VERIFICATION QUERIES (commented out - uncomment to check)
-- ============================================================================

-- Check if cron job is scheduled
-- SELECT * FROM calendar_sync_cron_status;

-- Check recent cron job runs
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname = 'google-calendar-sync-all-users'
-- ) ORDER BY start_time DESC LIMIT 10;

-- Manually trigger the sync function (for testing)
-- SELECT update_calendar_sync_schedule();

-- View all active sync settings
-- SELECT user_id, enabled, auto_sync_enabled, sync_interval_minutes, last_sync_at
-- FROM calendar_sync_settings
-- WHERE enabled = true
-- ORDER BY last_sync_at DESC;
