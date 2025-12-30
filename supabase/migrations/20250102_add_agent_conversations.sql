-- ============================================================================
-- Agent Conversations: Persistent chat history for agent commands
-- ============================================================================
-- Created: 2025-01-02
-- Purpose: Store agent command conversations separately from AI Q&A conversations
--          with agent-specific metadata (tasks, sub-agents, tokens)
-- ============================================================================

-- 1. Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,

  -- Conversation metadata
  title TEXT NOT NULL DEFAULT 'New Agent Conversation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Metrics (aggregated from messages)
  message_count INTEGER DEFAULT 0 NOT NULL,
  task_count INTEGER DEFAULT 0 NOT NULL,
  sub_agents_spawned INTEGER DEFAULT 0 NOT NULL,
  tokens_used INTEGER DEFAULT 0 NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create agent_conversation_messages table
CREATE TABLE IF NOT EXISTS agent_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,

  -- Agent-specific metadata (stored as JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Metadata structure:
  -- {
  --   "tasks_created": ["uuid1", "uuid2"],  // References to agent_tasks.id
  --   "sub_agents_spawned": ["uuid1", "uuid2"],  // References to sub_agents.id
  --   "tokens_used": 1234,
  --   "execution_time_ms": 850,
  --   "translation_duration_ms": 234  // Time to translate command
  -- }

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversation_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies (users can only access their own data)
-- ============================================================================

CREATE POLICY "Users can manage their own agent conversations"
ON agent_conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent conversation messages"
ON agent_conversation_messages FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id
  ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_session_id
  ON agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_status
  ON agent_conversations(status);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at
  ON agent_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversation_messages_conversation_id
  ON agent_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_messages_sequence
  ON agent_conversation_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_messages_timestamp
  ON agent_conversation_messages(timestamp DESC);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- Trigger to update updated_at on agent_conversations
CREATE OR REPLACE FUNCTION update_agent_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_conversations_updated_at_trigger
BEFORE UPDATE ON agent_conversations
FOR EACH ROW
EXECUTE FUNCTION update_agent_conversations_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE agent_conversations IS 'Persistent chat history for agent command sessions with task/token tracking';
COMMENT ON TABLE agent_conversation_messages IS 'Individual messages in agent conversations with execution metadata';
COMMENT ON COLUMN agent_conversation_messages.metadata IS 'JSONB storing tasks_created, sub_agents_spawned, tokens_used, execution_time_ms';
COMMENT ON COLUMN agent_conversations.status IS 'active: currently in use, archived: completed/saved for history';
