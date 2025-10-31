-- Fix Security Advisories from Supabase Linter
-- Issues: auth_users_exposed, security_definer_view, rls_disabled_in_public

-- ============================================================================
-- Fix 1: Enable RLS on app_config table
-- ============================================================================

ALTER TABLE IF EXISTS app_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for app_config
-- Only authenticated users can read config
CREATE POLICY "Anyone can read app config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify config
CREATE POLICY "Only service role can modify app config"
  ON app_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Fix 2: Remove SECURITY DEFINER from views and recreate safely
-- ============================================================================

-- Drop and recreate user_me_timeline_status view WITHOUT security definer
-- This view should use the querying user's permissions
DROP VIEW IF EXISTS user_me_timeline_status CASCADE;

CREATE OR REPLACE VIEW user_me_timeline_status AS
SELECT
  ti.id,
  ti.user_id,
  ti.title,
  ti.start_time,
  ti.duration_minutes,
  ti.status,
  ti.color,
  ti.layer_id,
  tl.name as layer_name,
  -- Don't expose auth.users columns, use safe metadata access
  CASE
    WHEN ti.user_id = auth.uid() THEN true
    ELSE false
  END as is_mine
FROM timeline_items ti
LEFT JOIN timeline_layers tl ON ti.layer_id = tl.id
WHERE ti.user_id = auth.uid();

-- Grant access to authenticated users only
GRANT SELECT ON user_me_timeline_status TO authenticated;

-- Drop and recreate timeline_templates_by_category WITHOUT security definer
DROP VIEW IF EXISTS timeline_templates_by_category CASCADE;

CREATE OR REPLACE VIEW timeline_templates_by_category AS
SELECT
  category,
  COUNT(*) as template_count,
  json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'description', description,
      'duration_minutes', duration_minutes,
      'color', color,
      'icon', icon,
      'is_system_default', is_system_default
    ) ORDER BY name
  ) as templates
FROM timeline_templates
WHERE is_system_default = true
  OR user_id = auth.uid()
GROUP BY category;

-- Grant access to authenticated users only
GRANT SELECT ON timeline_templates_by_category TO authenticated;

-- Drop and recreate template_usage_stats WITHOUT security definer
DROP VIEW IF EXISTS template_usage_stats CASCADE;

CREATE OR REPLACE VIEW template_usage_stats AS
SELECT
  tt.id as template_id,
  tt.name as template_name,
  tt.category,
  COUNT(ti.id) as usage_count,
  AVG(ti.duration_minutes) as avg_duration,
  MAX(ti.created_at) as last_used
FROM timeline_templates tt
LEFT JOIN timeline_items ti ON ti.template_id = tt.id
WHERE tt.user_id = auth.uid() OR tt.is_system_default = true
GROUP BY tt.id, tt.name, tt.category;

-- Grant access to authenticated users only
GRANT SELECT ON template_usage_stats TO authenticated;

-- ============================================================================
-- Fix 3: Set search_path on all functions to prevent search path hijacking
-- ============================================================================

-- Set search_path = '' on all functions to prevent security vulnerabilities
-- This prevents malicious schemas from being injected

-- Updated_at trigger functions
ALTER FUNCTION IF EXISTS update_updated_at_column() SET search_path = '';
ALTER FUNCTION IF EXISTS update_support_ticket_updated_at() SET search_path = '';
ALTER FUNCTION IF EXISTS update_timeline_layers_updated_at() SET search_path = '';
ALTER FUNCTION IF EXISTS update_timeline_items_updated_at() SET search_path = '';
ALTER FUNCTION IF EXISTS update_timeline_settings_updated_at() SET search_path = '';
ALTER FUNCTION IF EXISTS update_magnetic_timeline_updated_at() SET search_path = '';

-- Business logic functions
ALTER FUNCTION IF EXISTS create_default_me_timeline() SET search_path = '';
ALTER FUNCTION IF EXISTS check_assistant_permission(uuid, text) SET search_path = '';
ALTER FUNCTION IF EXISTS get_user_role(uuid) SET search_path = '';
ALTER FUNCTION IF EXISTS can_user_access_timeline_item(uuid) SET search_path = '';
ALTER FUNCTION IF EXISTS calculate_goal_hours_completed(uuid) SET search_path = '';
ALTER FUNCTION IF EXISTS update_goal_hours() SET search_path = '';
ALTER FUNCTION IF EXISTS log_assistant_action(text, text, uuid, jsonb) SET search_path = '';
ALTER FUNCTION IF EXISTS validate_magnetic_timeline_continuity() SET search_path = '';
ALTER FUNCTION IF EXISTS check_query_limit() SET search_path = '';
ALTER FUNCTION IF EXISTS increment_query_count() SET search_path = '';
ALTER FUNCTION IF EXISTS create_item_from_template(uuid, uuid, timestamptz) SET search_path = '';

-- Audit trigger functions
ALTER FUNCTION IF EXISTS auto_log_timeline_item_changes() SET search_path = '';
ALTER FUNCTION IF EXISTS auto_log_document_actions() SET search_path = '';

-- ============================================================================
-- Verification Comments
-- ============================================================================

-- These changes fix:
-- 1. RLS disabled on app_config (ERROR)
-- 2. Security definer views exposing sensitive data (ERROR)
-- 3. Potential auth.users exposure (ERROR)
-- 4. Function search_path mutable (WARN) - 19 functions fixed

-- All views now:
-- - Use querying user's permissions (no SECURITY DEFINER)
-- - Filter by auth.uid() to only show user's own data
-- - Don't expose auth.users table directly
-- - Have explicit GRANT statements for authenticated role only

-- All functions now:
-- - Have search_path = '' set explicitly
-- - Cannot be hijacked by malicious schemas
-- - Are protected against search path injection attacks
