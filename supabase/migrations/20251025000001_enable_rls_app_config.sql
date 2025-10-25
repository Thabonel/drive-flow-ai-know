-- Enable Row Level Security on app_config table
-- This table stores sensitive configuration like encryption keys
-- and should NOT be accessible to regular users

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "app_config_no_public_access" ON public.app_config;

-- Create restrictive policy: NO public access
-- Only service role and postgres can access this table
CREATE POLICY "app_config_no_public_access"
  ON public.app_config
  FOR ALL
  USING (false);

-- Grant explicit access to service role for Edge Functions
GRANT SELECT ON public.app_config TO service_role;

-- Add comment to document security requirement
COMMENT ON TABLE public.app_config IS 'Stores sensitive app configuration including encryption keys. RLS enabled with no public access.';
