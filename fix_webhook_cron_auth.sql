-- ============================================================
-- Fix Webhook Cron Job - Service Role Key Access
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- OPTION 1: Store service role key in Vault (Recommended)
-- First, insert your service role key into Vault
-- Replace 'YOUR_ACTUAL_SERVICE_ROLE_KEY' with your actual key from:
-- https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/api

-- Insert secret into Vault (run this first)
-- Note: You'll need to replace the key value below
/*
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZza3d1dG5veGJiZmx6cXJwaHJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMDE1NTM3NCwiZXhwIjoyMDM1NzMxMzc0fQ.YOUR_ACTUAL_KEY_HERE',
  'supabase_service_role_key',
  'Service role key for webhook processing'
);
*/

-- OPTION 2: Update cron job to use Vault
-- Unschedule the existing failing job
SELECT cron.unschedule('process-stripe-webhooks');

-- Reschedule with Vault secret retrieval
SELECT cron.schedule(
  'process-stripe-webhooks',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_service_role_key'
        LIMIT 1
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- OPTION 3: If Vault is not available, use a secure function approach
-- Create a function with embedded key (less secure, but functional)
-- WARNING: Only use if Vault doesn't work

/*
CREATE OR REPLACE FUNCTION trigger_webhook_processor()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result bigint;
BEGIN
  -- Replace with your actual service role key
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO result;

  RETURN result;
END;
$$;

-- Then schedule to call this function
SELECT cron.unschedule('process-stripe-webhooks');
SELECT cron.schedule(
  'process-stripe-webhooks',
  '*/2 * * * *',
  $$SELECT trigger_webhook_processor()$$
);
*/

-- ============================================================
-- VERIFICATION
-- ============================================================

-- 1. Check if Vault extension exists
SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'vault'
) AS vault_available;

-- 2. View scheduled job
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'process-stripe-webhooks';

-- 3. Check recent executions (wait 2 minutes after setup)
SELECT
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-stripe-webhooks')
ORDER BY start_time DESC
LIMIT 3;

-- 4. If you see secrets in vault:
-- SELECT name FROM vault.decrypted_secrets;
