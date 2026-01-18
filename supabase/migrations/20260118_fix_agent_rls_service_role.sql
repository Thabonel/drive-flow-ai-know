-- ============================================================================
-- Fix Agent Mode RLS Policies for Service Role Access
-- ============================================================================
-- When Edge Functions use the service role key, auth.uid() returns NULL,
-- causing RLS policies to block all operations. This migration adds
-- service role bypass to agent tables.
-- ============================================================================

-- Drop existing policies (we'll recreate them with service role bypass)
DROP POLICY IF EXISTS "Users can manage their own agent sessions" ON agent_sessions;
DROP POLICY IF EXISTS "Users can manage their own agent memory" ON agent_memory;
DROP POLICY IF EXISTS "Users can manage their own sub-agents" ON sub_agents;
DROP POLICY IF EXISTS "Users can manage their own agent tasks" ON agent_tasks;

-- Recreate policies with service role bypass
-- The auth.role() = 'service_role' check allows Edge Functions to operate

CREATE POLICY "Users can manage their own agent sessions"
ON agent_sessions FOR ALL
USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can manage their own agent memory"
ON agent_memory FOR ALL
USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can manage their own sub-agents"
ON sub_agents FOR ALL
USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can manage their own agent tasks"
ON agent_tasks FOR ALL
USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON POLICY "Users can manage their own agent sessions" ON agent_sessions IS
'Users can only access their own sessions. Service role can access all for Edge Functions.';

COMMENT ON POLICY "Users can manage their own agent memory" ON agent_memory IS
'Users can only access their own memory entries. Service role can access all for Edge Functions.';

COMMENT ON POLICY "Users can manage their own sub-agents" ON sub_agents IS
'Users can only access their own sub-agents. Service role can access all for Edge Functions.';

COMMENT ON POLICY "Users can manage their own agent tasks" ON agent_tasks IS
'Users can only access their own tasks. Service role can access all for Edge Functions.';
