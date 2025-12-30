-- ============================================================================
-- Mini-Me Agent Mode: Database Schema (Slice 1)
-- ============================================================================
-- Creates tables and settings for autonomous agent functionality
-- ============================================================================

-- 1. Add agent_mode to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS agent_mode BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN user_settings.agent_mode IS 'Toggles between Human Assistant (false) and Agent Assistant (true) modes';

-- 2. Create agent_sessions table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'idle', 'completed')),

  -- Session metrics
  tokens_used INTEGER DEFAULT 0 NOT NULL,
  tokens_budget INTEGER DEFAULT 100000 NOT NULL, -- 100k tokens/day default
  tasks_completed INTEGER DEFAULT 0 NOT NULL,
  sub_agents_spawned INTEGER DEFAULT 0 NOT NULL,

  -- Cost tracking (added in Slice 16)
  cost_tracking JSONB DEFAULT '{
    "tokens_opus": 0,
    "tokens_sonnet": 0,
    "tokens_haiku": 0,
    "estimated_cost_usd": 0.0,
    "last_cost_update": null
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create agent_memory table (external notepad)
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory content
  memory_type TEXT NOT NULL CHECK (memory_type IN ('goal', 'checkpoint', 'action_log', 'briefing', 'insight')),
  content JSONB NOT NULL,

  -- Metadata
  importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create sub_agents table
CREATE TABLE IF NOT EXISTS sub_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Agent details
  agent_type TEXT NOT NULL CHECK (agent_type IN ('calendar', 'briefing', 'analysis')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),

  -- Task data
  task_data JSONB NOT NULL,
  result_data JSONB,
  error_message TEXT,

  -- Priority (for coordination)
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 0 AND 2), -- 0=P0, 1=P1, 2=P2

  -- Metrics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create agent_tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task details
  original_input TEXT NOT NULL,
  structured_output JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed')),

  -- Priority (inherited from structured_output or set explicitly)
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 0 AND 2),

  -- Assignment
  assigned_agent_id UUID REFERENCES sub_agents(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies (users can only access their own data)
-- ============================================================================

-- agent_sessions policies
CREATE POLICY "Users can manage their own agent sessions"
ON agent_sessions FOR ALL USING (auth.uid() = user_id);

-- agent_memory policies
CREATE POLICY "Users can manage their own agent memory"
ON agent_memory FOR ALL USING (auth.uid() = user_id);

-- sub_agents policies
CREATE POLICY "Users can manage their own sub-agents"
ON sub_agents FOR ALL USING (auth.uid() = user_id);

-- agent_tasks policies
CREATE POLICY "Users can manage their own agent tasks"
ON agent_tasks FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_agent_memory_session_id ON agent_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_recent ON agent_memory(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_agents_session_id ON sub_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_sub_agents_status ON sub_agents(status);
CREATE INDEX IF NOT EXISTS idx_sub_agents_priority ON sub_agents(priority, status);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_session_id ON agent_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority, status);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- Ensure update_updated_at_column function exists (may already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_sessions_updated_at
BEFORE UPDATE ON agent_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_agents_updated_at
BEFORE UPDATE ON sub_agents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
BEFORE UPDATE ON agent_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE agent_sessions IS 'Tracks autonomous agent sessions with lifecycle and metrics';
COMMENT ON TABLE agent_memory IS 'External notepad for agent goals, checkpoints, and action logs';
COMMENT ON TABLE sub_agents IS 'Individual sub-agents (calendar, briefing, analysis) spawned by orchestrator';
COMMENT ON TABLE agent_tasks IS 'Translated tasks from unstructured user input';

COMMENT ON COLUMN agent_sessions.status IS 'active=running, paused=user stopped, idle=no activity for 5min, completed=session ended';
COMMENT ON COLUMN agent_sessions.tokens_budget IS 'Daily token limit (default 100k) to prevent runaway costs';
COMMENT ON COLUMN sub_agents.priority IS '0=P0 (user-initiated), 1=P1 (time-sensitive), 2=P2 (background)';
