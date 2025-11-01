-- ========================================================================
-- FEEDBACK & ONBOARDING TRACKING
-- ========================================================================

-- User feedback table
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback details
  feedback_type TEXT NOT NULL CHECK (
    feedback_type IN ('general', 'bug', 'feature', 'ai')
  ),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,

  -- Context
  url TEXT,
  user_agent TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'reviewing', 'planned', 'in_progress', 'completed', 'closed')
  ),
  admin_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Onboarding progress tracking
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Steps completed
  welcome_completed BOOLEAN DEFAULT FALSE,
  calendar_connected BOOLEAN DEFAULT FALSE,
  planning_time_set BOOLEAN DEFAULT FALSE,
  ai_personality_set BOOLEAN DEFAULT FALSE,
  first_plan_generated BOOLEAN DEFAULT FALSE,

  -- Completion
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product usage milestones
CREATE TABLE user_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Milestone details
  milestone_type TEXT NOT NULL,
  milestone_value INTEGER,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User notified
  notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone_type)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created ON user_feedback(created_at DESC);

CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_completed ON onboarding_progress(completed) WHERE completed = FALSE;

CREATE INDEX idx_user_milestones_user ON user_milestones(user_id);
CREATE INDEX idx_user_milestones_type ON user_milestones(milestone_type);
CREATE INDEX idx_user_milestones_notified ON user_milestones(notified) WHERE notified = FALSE;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User feedback
CREATE POLICY "Users can insert their own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own feedback"
  ON user_feedback FOR SELECT
  USING (user_id = auth.uid());

-- Onboarding progress
CREATE POLICY "Users can view their own progress"
  ON onboarding_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON onboarding_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage onboarding"
  ON onboarding_progress FOR ALL
  USING (true);

-- User milestones
CREATE POLICY "Users can view their own milestones"
  ON user_milestones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert milestones"
  ON user_milestones FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Initialize onboarding for new user
CREATE FUNCTION initialize_onboarding(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO onboarding_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track milestone achievement
CREATE FUNCTION track_milestone(
  p_user_id UUID,
  p_milestone_type TEXT,
  p_milestone_value INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_milestones (
    user_id,
    milestone_type,
    milestone_value
  )
  VALUES (
    p_user_id,
    p_milestone_type,
    p_milestone_value
  )
  ON CONFLICT (user_id, milestone_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger
CREATE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Feedback and onboarding migration completed!' AS status;

SELECT 'Created ' || COUNT(*) || ' tables (expected: 3)' AS result
FROM information_schema.tables
WHERE table_name IN ('user_feedback', 'onboarding_progress', 'user_milestones');
