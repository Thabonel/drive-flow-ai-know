-- Living Assistant: Semantic Memory System
-- Created: 2026-02-05
-- Purpose: Persistent semantic memory with pgvector for AI assistant

-- =============================================================================
-- PART 1: Enable pgvector extension
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- PART 2: Core semantic memories table with embeddings
-- =============================================================================
CREATE TABLE IF NOT EXISTS semantic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'conversation_summary',  -- Summary of a conversation
    'user_fact',             -- Facts about the user (preferences, info)
    'user_goal',             -- User's goals and objectives
    'user_correction',       -- Corrections the user made to AI responses
    'contact',               -- Information about user's contacts
    'routine',               -- User's routines and habits
    'preference'             -- User preferences for AI behavior
  )),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN (
    'text_chat',             -- From text conversation
    'voice_transcript',      -- From voice message
    'phone_call',            -- From phone conversation
    'email',                 -- From email
    'calendar',              -- From calendar events
    'manual'                 -- Manually added by user
  )),

  -- Content
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension

  -- Importance and retrieval
  importance_score INTEGER NOT NULL DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 10),
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Context metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Related memories (for linking)
  related_memory_ids UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ  -- NULL means never expires
);

-- =============================================================================
-- PART 3: User goals tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  goal_type TEXT NOT NULL DEFAULT 'personal' CHECK (goal_type IN (
    'personal',     -- Personal goals
    'professional', -- Work goals
    'health',       -- Health & wellness
    'learning',     -- Learning & development
    'financial',    -- Financial goals
    'relationship', -- Relationship goals
    'project'       -- Specific project goals
  )),

  -- Status and priority
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',       -- Currently working on
    'on_hold',      -- Temporarily paused
    'completed',    -- Successfully completed
    'abandoned'     -- No longer pursuing
  )),
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),

  -- Timeline
  target_date DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  milestones JSONB DEFAULT '[]',

  -- AI assistance preferences
  check_in_frequency TEXT DEFAULT 'weekly' CHECK (check_in_frequency IN (
    'daily', 'weekly', 'biweekly', 'monthly', 'never'
  )),
  last_check_in_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 4: User contacts (people the user talks about)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  nickname TEXT,
  relationship TEXT, -- e.g., 'wife', 'boss', 'friend', 'colleague'

  -- Contact details
  email TEXT,
  phone TEXT,

  -- Context the AI learned
  notes TEXT,
  facts JSONB DEFAULT '[]', -- Array of facts about this person

  -- Interaction tracking
  mention_count INTEGER NOT NULL DEFAULT 0,
  last_mentioned_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 5: Learning feedback (when user corrects AI)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback classification
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'tone_correction',        -- AI used wrong tone
    'factual_correction',     -- AI got facts wrong
    'preference_update',      -- User prefers different approach
    'style_feedback',         -- Feedback on response style
    'boundary_setting',       -- Setting limits on AI behavior
    'positive_reinforcement'  -- User explicitly liked something
  )),

  -- What happened
  original_response TEXT,
  corrected_response TEXT,
  user_feedback TEXT,

  -- What AI should learn
  learned_rule TEXT,

  -- Embeddings for retrieval
  embedding vector(1536),

  -- Context
  conversation_id UUID,
  source_type TEXT CHECK (source_type IN ('text_chat', 'voice_transcript', 'phone_call')),

  -- Effectiveness tracking
  applied_count INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  is_effective BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 6: Aggregated learning profile
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Communication preferences (learned over time)
  communication_style JSONB DEFAULT '{
    "formality_level": "neutral",
    "preferred_length": "medium",
    "uses_emojis": false,
    "technical_level": "moderate",
    "humor_preference": "occasional"
  }',

  -- Response preferences
  response_preferences JSONB DEFAULT '{
    "include_sources": true,
    "ask_before_acting": true,
    "proactive_suggestions": true,
    "notification_frequency": "moderate"
  }',

  -- Topics of interest
  interests JSONB DEFAULT '[]',
  expertise_areas JSONB DEFAULT '[]',

  -- Boundaries and limits
  boundaries JSONB DEFAULT '{
    "do_not_discuss": [],
    "sensitive_topics": [],
    "auto_actions_allowed": false
  }',

  -- Statistics
  total_interactions INTEGER NOT NULL DEFAULT 0,
  total_corrections INTEGER NOT NULL DEFAULT 0,
  total_positive_feedback INTEGER NOT NULL DEFAULT 0,

  -- Last profile update
  profile_version INTEGER NOT NULL DEFAULT 1,
  last_profile_update_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 7: Conversation summaries (for Telegram logging)
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation identification
  conversation_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'text_chat', 'voice_transcript', 'phone_call', 'email', 'telegram'
  )),

  -- Chunking for long conversations
  chunk_index INTEGER NOT NULL DEFAULT 0,

  -- Content
  raw_content TEXT NOT NULL,
  summary TEXT,

  -- Extracted information
  key_topics TEXT[] DEFAULT '{}',
  mentioned_entities JSONB DEFAULT '[]', -- People, places, things mentioned
  action_items JSONB DEFAULT '[]',       -- Tasks/follow-ups identified
  decisions_made JSONB DEFAULT '[]',     -- Decisions recorded

  -- Timestamps
  conversation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 8: Proactive check-in logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS proactive_checkin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Check-in details
  check_in_type TEXT NOT NULL CHECK (check_in_type IN ('scheduled', 'triggered', 'manual')),
  urgency_score INTEGER NOT NULL CHECK (urgency_score BETWEEN 0 AND 10),

  -- Decision
  action_taken TEXT NOT NULL CHECK (action_taken IN ('skip', 'text', 'call')),
  action_reason TEXT,

  -- Context at time of check-in
  context_snapshot JSONB NOT NULL DEFAULT '{}',
  -- e.g., { emails: { urgent: 2, unread: 5 }, calendar: { next_meeting_mins: 30 }, tasks: { overdue: 1 } }

  -- If action was taken
  message_sent TEXT,
  call_initiated BOOLEAN DEFAULT FALSE,
  call_duration_seconds INTEGER,

  -- User response
  user_responded BOOLEAN DEFAULT FALSE,
  user_response_time_seconds INTEGER,
  user_feedback TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 9: Autonomy sessions (2-hour safeguard)
-- =============================================================================
CREATE TABLE IF NOT EXISTS autonomy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  ended_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'ended', 'extended')),

  -- Action tracking
  actions_count INTEGER NOT NULL DEFAULT 0,
  actions_log JSONB DEFAULT '[]',

  -- Extension tracking
  extension_count INTEGER NOT NULL DEFAULT 0,
  last_extended_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 10: Audit logging for security
-- =============================================================================
CREATE TABLE IF NOT EXISTS assistant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'memory_access',       -- Accessed user memory
    'memory_write',        -- Wrote to memory
    'outbound_call',       -- Initiated phone call
    'outbound_message',    -- Sent Telegram message
    'email_read',          -- Read user email
    'calendar_access',     -- Accessed calendar
    'task_action',         -- Modified tasks
    'autonomy_action',     -- Action during autonomy session
    'security_event'       -- Security-related event
  )),

  -- What happened
  description TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,

  -- Additional context
  request_metadata JSONB DEFAULT '{}',
  response_metadata JSONB DEFAULT '{}',

  -- Source
  source_channel TEXT CHECK (source_channel IN ('telegram', 'phone', 'web', 'api', 'cron')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Semantic memories indexes
CREATE INDEX IF NOT EXISTS idx_semantic_memories_user ON semantic_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_type ON semantic_memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_source ON semantic_memories(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_importance ON semantic_memories(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_created ON semantic_memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_tags ON semantic_memories USING GIN (tags);

-- Vector similarity search index (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_semantic_memories_embedding ON semantic_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- User goals indexes
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_goals_priority ON user_goals(user_id, priority DESC) WHERE status = 'active';

-- User contacts indexes
CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_name ON user_contacts(user_id, name);

-- Learning feedback indexes
CREATE INDEX IF NOT EXISTS idx_learning_feedback_user ON learning_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_type ON learning_feedback(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_embedding ON learning_feedback
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Conversation summaries indexes
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_date ON conversation_summaries(user_id, conversation_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_topics ON conversation_summaries USING GIN (key_topics);

-- Proactive check-in logs indexes
CREATE INDEX IF NOT EXISTS idx_proactive_checkin_user ON proactive_checkin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_checkin_created ON proactive_checkin_logs(user_id, created_at DESC);

-- Autonomy sessions indexes
CREATE INDEX IF NOT EXISTS idx_autonomy_sessions_user ON autonomy_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_sessions_active ON autonomy_sessions(user_id, status) WHERE status = 'active';

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON assistant_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON assistant_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON assistant_audit_log(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE semantic_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_checkin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access own semantic_memories"
  ON semantic_memories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own user_goals"
  ON user_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own user_contacts"
  ON user_contacts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own learning_feedback"
  ON learning_feedback FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own user_learning_profile"
  ON user_learning_profile FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own conversation_summaries"
  ON conversation_summaries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own proactive_checkin_logs"
  ON proactive_checkin_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own autonomy_sessions"
  ON autonomy_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own assistant_audit_log"
  ON assistant_audit_log FOR ALL USING (auth.uid() = user_id);

-- Service role can access all (for Edge Functions)
CREATE POLICY "Service role can access all semantic_memories"
  ON semantic_memories FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access all conversation_summaries"
  ON conversation_summaries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access all proactive_checkin_logs"
  ON proactive_checkin_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access all assistant_audit_log"
  ON assistant_audit_log FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to search memories by vector similarity
CREATE OR REPLACE FUNCTION search_semantic_memories(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_memory_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  source_type TEXT,
  content TEXT,
  importance_score INTEGER,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.memory_type,
    sm.source_type,
    sm.content,
    sm.importance_score,
    1 - (sm.embedding <=> p_query_embedding) AS similarity,
    sm.created_at
  FROM semantic_memories sm
  WHERE sm.user_id = p_user_id
    AND sm.embedding IS NOT NULL
    AND (p_memory_types IS NULL OR sm.memory_type = ANY(p_memory_types))
    AND (1 - (sm.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY sm.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user context for AI queries
CREATE OR REPLACE FUNCTION get_user_memory_context(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_include_goals BOOLEAN DEFAULT TRUE,
  p_include_contacts BOOLEAN DEFAULT TRUE,
  p_include_profile BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}';
  v_memories JSONB;
  v_goals JSONB;
  v_contacts JSONB;
  v_profile JSONB;
BEGIN
  -- Get relevant memories
  SELECT jsonb_agg(jsonb_build_object(
    'type', memory_type,
    'content', content,
    'importance', importance_score,
    'similarity', similarity
  ))
  INTO v_memories
  FROM search_semantic_memories(p_user_id, p_query_embedding, NULL, 5, 0.6);

  v_result := v_result || jsonb_build_object('memories', COALESCE(v_memories, '[]'::jsonb));

  -- Get active goals
  IF p_include_goals THEN
    SELECT jsonb_agg(jsonb_build_object(
      'title', title,
      'description', description,
      'priority', priority,
      'progress', progress_percentage,
      'target_date', target_date
    ))
    INTO v_goals
    FROM user_goals
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY priority DESC
    LIMIT 5;

    v_result := v_result || jsonb_build_object('goals', COALESCE(v_goals, '[]'::jsonb));
  END IF;

  -- Get frequently mentioned contacts
  IF p_include_contacts THEN
    SELECT jsonb_agg(jsonb_build_object(
      'name', name,
      'relationship', relationship,
      'notes', notes
    ))
    INTO v_contacts
    FROM user_contacts
    WHERE user_id = p_user_id
    ORDER BY mention_count DESC
    LIMIT 5;

    v_result := v_result || jsonb_build_object('contacts', COALESCE(v_contacts, '[]'::jsonb));
  END IF;

  -- Get learning profile
  IF p_include_profile THEN
    SELECT jsonb_build_object(
      'communication_style', communication_style,
      'response_preferences', response_preferences,
      'boundaries', boundaries
    )
    INTO v_profile
    FROM user_learning_profile
    WHERE user_id = p_user_id;

    v_result := v_result || jsonb_build_object('profile', COALESCE(v_profile, '{}'::jsonb));
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract and store memory from conversation
CREATE OR REPLACE FUNCTION store_memory_from_conversation(
  p_user_id UUID,
  p_content TEXT,
  p_memory_type TEXT,
  p_source_type TEXT,
  p_embedding vector(1536) DEFAULT NULL,
  p_importance_score INTEGER DEFAULT 3,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_memory_id UUID;
BEGIN
  INSERT INTO semantic_memories (
    user_id,
    memory_type,
    source_type,
    content,
    embedding,
    importance_score,
    metadata
  ) VALUES (
    p_user_id,
    p_memory_type,
    p_source_type,
    p_content,
    p_embedding,
    p_importance_score,
    p_metadata
  )
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check/create autonomy session
CREATE OR REPLACE FUNCTION check_autonomy_session(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Check for active session
  SELECT * INTO v_session
  FROM autonomy_sessions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'session_id', v_session.id,
      'status', 'active',
      'expires_at', v_session.expires_at,
      'actions_count', v_session.actions_count,
      'requires_confirmation', FALSE
    );
  ELSE
    RETURN jsonb_build_object(
      'session_id', NULL,
      'status', 'none',
      'requires_confirmation', TRUE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_source_channel TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO assistant_audit_log (
    user_id,
    action_type,
    description,
    source_channel,
    target_type,
    target_id,
    request_metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_description,
    p_source_channel,
    p_target_type,
    p_target_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_semantic_memories_updated_at
  BEFORE UPDATE ON semantic_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_contacts_updated_at
  BEFORE UPDATE ON user_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_profile_updated_at
  BEFORE UPDATE ON user_learning_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
