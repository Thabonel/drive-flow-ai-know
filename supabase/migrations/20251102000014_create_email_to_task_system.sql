-- ========================================================================
-- AI DAILY BRIEF & EMAIL-TO-TASK SYSTEM
-- ========================================================================

-- Table for received emails
CREATE TABLE received_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User relationship
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email metadata
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Email headers (for threading, etc.)
  message_id TEXT,
  in_reply_to TEXT,
  email_references TEXT,

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed', 'ignored')
  ),
  processed_at TIMESTAMPTZ,

  -- AI extraction results
  ai_extracted_tasks JSONB DEFAULT '[]'::JSONB,
  ai_summary TEXT,
  ai_category TEXT CHECK (ai_category IN ('actionable', 'informational', 'spam', 'newsletter', 'meeting', 'other')),
  ai_priority INTEGER CHECK (ai_priority BETWEEN 1 AND 5),

  -- User actions
  user_reviewed BOOLEAN DEFAULT FALSE,
  ignored_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_from_email CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table for tasks created from emails
CREATE TABLE email_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES received_emails(id) ON DELETE CASCADE,
  timeline_item_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,

  -- AI extracted metadata
  estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
  ai_priority INTEGER CHECK (ai_priority BETWEEN 1 AND 5) DEFAULT 3,
  ai_suggested_deadline TIMESTAMPTZ,
  ai_category TEXT,

  -- Task status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'converted')
  ),

  -- User modifications
  user_edited_title TEXT,
  user_edited_description TEXT,
  user_edited_priority INTEGER CHECK (user_edited_priority BETWEEN 1 AND 5),
  user_edited_deadline TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  CONSTRAINT valid_title CHECK (LENGTH(title) > 0 AND LENGTH(title) <= 500)
);

-- Table for email sender patterns (learning)
CREATE TABLE email_sender_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,

  -- Pattern statistics
  total_emails_received INTEGER DEFAULT 1,
  actionable_count INTEGER DEFAULT 0,
  ignored_count INTEGER DEFAULT 0,
  spam_count INTEGER DEFAULT 0,

  -- Learned preferences
  auto_category TEXT,
  auto_priority INTEGER CHECK (auto_priority BETWEEN 1 AND 5),
  auto_ignore BOOLEAN DEFAULT FALSE,

  -- Timestamps
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_sender UNIQUE (user_id, sender_email)
);

-- Table for daily briefs
CREATE TABLE daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Brief metadata
  brief_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Brief content (AI generated)
  priority_meetings JSONB DEFAULT '[]'::JSONB,
  key_decisions JSONB DEFAULT '[]'::JSONB,
  tasks_due_today JSONB DEFAULT '[]'::JSONB,
  schedule_overview JSONB DEFAULT '[]'::JSONB,
  ai_insights TEXT,
  ai_suggestions JSONB DEFAULT '[]'::JSONB,

  -- Full brief text
  brief_html TEXT,
  brief_markdown TEXT,

  -- Email delivery
  emailed BOOLEAN DEFAULT FALSE,
  emailed_at TIMESTAMPTZ,
  email_opened BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_brief_date UNIQUE (user_id, brief_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_received_emails_user ON received_emails(user_id);
CREATE INDEX idx_received_emails_status ON received_emails(processing_status) WHERE processing_status != 'completed';
CREATE INDEX idx_received_emails_received_at ON received_emails(received_at DESC);
CREATE INDEX idx_received_emails_from_email ON received_emails(from_email);
CREATE INDEX idx_received_emails_category ON received_emails(ai_category);

CREATE INDEX idx_email_tasks_user ON email_tasks(user_id);
CREATE INDEX idx_email_tasks_email ON email_tasks(email_id);
CREATE INDEX idx_email_tasks_status ON email_tasks(status) WHERE status = 'pending';
CREATE INDEX idx_email_tasks_timeline ON email_tasks(timeline_item_id) WHERE timeline_item_id IS NOT NULL;
CREATE INDEX idx_email_tasks_created ON email_tasks(created_at DESC);

CREATE INDEX idx_email_sender_patterns_user ON email_sender_patterns(user_id);
CREATE INDEX idx_email_sender_patterns_email ON email_sender_patterns(sender_email);
CREATE INDEX idx_email_sender_patterns_auto_ignore ON email_sender_patterns(auto_ignore) WHERE auto_ignore = TRUE;

CREATE INDEX idx_daily_briefs_user ON daily_briefs(user_id);
CREATE INDEX idx_daily_briefs_date ON daily_briefs(brief_date DESC);
CREATE INDEX idx_daily_briefs_generated ON daily_briefs(generated_at DESC);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sender_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- received_emails policies
CREATE POLICY "Users can view their own emails"
  ON received_emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own emails"
  ON received_emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own emails"
  ON received_emails FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own emails"
  ON received_emails FOR DELETE
  USING (user_id = auth.uid());

-- email_tasks policies
CREATE POLICY "Users can view their own email tasks"
  ON email_tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email tasks"
  ON email_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own email tasks"
  ON email_tasks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own email tasks"
  ON email_tasks FOR DELETE
  USING (user_id = auth.uid());

-- email_sender_patterns policies
CREATE POLICY "Users can view their own sender patterns"
  ON email_sender_patterns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sender patterns"
  ON email_sender_patterns FOR ALL
  USING (user_id = auth.uid());

-- daily_briefs policies
CREATE POLICY "Users can view their own daily briefs"
  ON daily_briefs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own daily briefs"
  ON daily_briefs FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get pending email tasks count
CREATE FUNCTION get_pending_email_tasks_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM email_tasks
    WHERE user_id = p_user_id
      AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sender pattern statistics
CREATE FUNCTION update_sender_pattern(
  p_user_id UUID,
  p_sender_email TEXT,
  p_category TEXT,
  p_is_actionable BOOLEAN,
  p_is_ignored BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO email_sender_patterns (user_id, sender_email, total_emails_received)
  VALUES (p_user_id, p_sender_email, 1)
  ON CONFLICT (user_id, sender_email)
  DO UPDATE SET
    total_emails_received = email_sender_patterns.total_emails_received + 1,
    actionable_count = email_sender_patterns.actionable_count + CASE WHEN p_is_actionable THEN 1 ELSE 0 END,
    ignored_count = email_sender_patterns.ignored_count + CASE WHEN p_is_ignored THEN 1 ELSE 0 END,
    spam_count = email_sender_patterns.spam_count + CASE WHEN p_category = 'spam' THEN 1 ELSE 0 END,
    last_seen = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get today's brief data
CREATE FUNCTION get_daily_brief_data(p_user_id UUID, p_date DATE)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'priority_meetings', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'start_time', start_time,
          'end_time', end_time,
          'type', type,
          'location', location,
          'attendees', attendees
        )
      ), '[]'::JSONB)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
        AND type IN ('meeting', 'important-meeting', 'video-call')
      ORDER BY start_time
    ),
    'tasks_due_today', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'priority', metadata->>'priority',
          'estimated_duration', metadata->>'estimatedDuration'
        )
      ), '[]'::JSONB)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(end_time) = p_date
        AND type = 'task'
        AND status != 'completed'
      ORDER BY (metadata->>'priority')::INTEGER DESC NULLS LAST
    ),
    'schedule_overview', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'start_time', start_time,
          'end_time', end_time,
          'type', type,
          'status', status
        )
      ), '[]'::JSONB)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
      ORDER BY start_time
    ),
    'pending_email_tasks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'priority', ai_priority,
          'from_email', (SELECT from_email FROM received_emails WHERE id = email_tasks.email_id)
        )
      ), '[]'::JSONB)
      FROM email_tasks
      WHERE user_id = p_user_id
        AND status = 'pending'
      ORDER BY ai_priority DESC
      LIMIT 10
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger function
CREATE FUNCTION update_email_system_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER received_emails_updated_at
  BEFORE UPDATE ON received_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_email_system_updated_at();

CREATE TRIGGER email_tasks_updated_at
  BEFORE UPDATE ON email_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_email_system_updated_at();

CREATE TRIGGER email_sender_patterns_updated_at
  BEFORE UPDATE ON email_sender_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_system_updated_at();

CREATE TRIGGER daily_briefs_updated_at
  BEFORE UPDATE ON daily_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_system_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Email-to-Task system migration completed!' AS status;

SELECT 'Created ' || COUNT(*) || ' tables (expected: 4)' AS result
FROM information_schema.tables
WHERE table_name IN ('received_emails', 'email_tasks', 'email_sender_patterns', 'daily_briefs');

SELECT 'Created ' || COUNT(*) || ' functions (expected: 4)' AS result
FROM information_schema.routines
WHERE routine_name IN (
  'get_pending_email_tasks_count',
  'update_sender_pattern',
  'get_daily_brief_data',
  'update_email_system_updated_at'
);
