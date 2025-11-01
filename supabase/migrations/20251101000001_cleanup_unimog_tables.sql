-- Cleanup Migration: Remove Unimog Project Tables
-- Created: 2025-11-01
-- Purpose: Drop all tables that were accidentally added from the unimog project

-- Drop support ticket tables
DROP TABLE IF EXISTS support_tickets CASCADE;

-- Drop enterprise server tables
DROP TABLE IF EXISTS enterprise_server_audit_log CASCADE;
DROP TABLE IF EXISTS enterprise_server_configs CASCADE;
DROP TABLE IF EXISTS public.enterprise_servers CASCADE;

-- Drop subscription and usage tables
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.usage_alerts CASCADE;
DROP TABLE IF EXISTS public.usage_tracking CASCADE;

-- Drop rate limiting tables (Google only - Microsoft rate limiting is legitimate)
DROP TABLE IF EXISTS public.google_token_audit_log CASCADE;
DROP TABLE IF EXISTS public.google_token_rate_limit CASCADE;

-- Drop security audit log (from unimog)
DROP TABLE IF EXISTS public.security_audit_log CASCADE;

-- Note: The following tables are KEPT as they are part of AI Query Hub:
-- - admin_settings (admin configuration)
-- - app_config (encryption keys for Microsoft tokens)
-- - user_microsoft_tokens (Microsoft OneDrive integration)
-- - microsoft_drive_folders (Microsoft OneDrive integration)
-- - microsoft_token_audit_log (Microsoft OneDrive security)
-- - microsoft_token_rate_limit (Microsoft OneDrive security)

-- Note: This migration only drops tables. The migration files that created
-- these tables have been deleted from the migrations directory.

COMMENT ON SCHEMA public IS
  'Cleaned up unimog project tables that were accidentally added to AI Query Hub database. Migration 20251101000001.';
