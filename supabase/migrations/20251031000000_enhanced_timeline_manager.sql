-- Enhanced Timeline Manager Migration
-- Adds "Me" timeline, templates, goals, and AI planning features
-- This migration preserves all existing data

-- ============================================================================
-- PART 1: CREATE NEW TABLES
-- ============================================================================

-- Timeline Templates Table (toolbox items like sleep, meals, exercise)
CREATE TABLE IF NOT EXISTS timeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  default_start_time TIME, -- Optional default time (e.g., 22:00 for sleep)
  category TEXT NOT NULL CHECK (category IN ('rest', 'personal', 'meal', 'health', 'work', 'travel', 'social', 'learning', 'other')),
  color TEXT NOT NULL,
  icon TEXT, -- Lucide icon name
  is_locked_time BOOLEAN DEFAULT FALSE, -- If true, cannot be moved/resized
  is_flexible BOOLEAN DEFAULT TRUE, -- If true, can be compressed when needed
  is_system_default BOOLEAN DEFAULT FALSE, -- System templates vs user-created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_template_name UNIQUE(user_id, name)
);

-- Timeline Goals Table (for AI goal planning)
CREATE TABLE IF NOT EXISTS timeline_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')) DEFAULT 'active',
  category TEXT, -- Same categories as templates
  estimated_hours NUMERIC(6, 2), -- Total hours needed
  hours_completed NUMERIC(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Goal Items Table (linking timeline items to goals)
CREATE TABLE IF NOT EXISTS timeline_goal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES timeline_goals(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  contribution_hours NUMERIC(6, 2) NOT NULL, -- How many hours this item contributes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, item_id)
);

-- Timeline AI Sessions Table (storing AI planning history)
CREATE TABLE IF NOT EXISTS timeline_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('optimize', 'plan', 'suggest', 'balance', 'compress')) NOT NULL,
  input_prompt TEXT NOT NULL,
  ai_response TEXT,
  items_created INTEGER DEFAULT 0,
  items_modified INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB, -- Store additional context (models used, tokens, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: ALTER EXISTING TABLES
-- ============================================================================

-- Add new columns to timeline_layers
ALTER TABLE timeline_layers
  ADD COLUMN IF NOT EXISTS is_primary_timeline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS timeline_type TEXT CHECK (timeline_type IN ('standard', 'magnetic')) DEFAULT 'standard';

-- Add constraint: only one primary timeline per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_layers_one_primary_per_user
  ON timeline_layers(user_id)
  WHERE is_primary_timeline = TRUE;

-- Add comment explaining the primary timeline concept
COMMENT ON COLUMN timeline_layers.is_primary_timeline IS 'The "Me" timeline - users primary 24-hour magnetic timeline';
COMMENT ON COLUMN timeline_layers.timeline_type IS 'standard: traditional timeline with gaps allowed, magnetic: no gaps, items snap together';

-- Add new columns to timeline_items
ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS is_locked_time BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES timeline_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES timeline_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_duration INTEGER;

-- Add comments
COMMENT ON COLUMN timeline_items.is_locked_time IS 'If true, item cannot be moved or resized (e.g., sleep schedule)';
COMMENT ON COLUMN timeline_items.is_flexible IS 'If true, item can be compressed when magnetic timeline needs space';
COMMENT ON COLUMN timeline_items.parent_item_id IS 'For sub-tasks or grouped items';
COMMENT ON COLUMN timeline_items.template_id IS 'Links to the template this item was created from';
COMMENT ON COLUMN timeline_items.original_duration IS 'Stores duration before compression for restoration';

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Timeline Templates indexes
CREATE INDEX IF NOT EXISTS idx_timeline_templates_user_id ON timeline_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_templates_category ON timeline_templates(category);
CREATE INDEX IF NOT EXISTS idx_timeline_templates_system_default ON timeline_templates(is_system_default) WHERE is_system_default = TRUE;

-- Timeline Goals indexes
CREATE INDEX IF NOT EXISTS idx_timeline_goals_user_id ON timeline_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_goals_status ON timeline_goals(status);
CREATE INDEX IF NOT EXISTS idx_timeline_goals_target_date ON timeline_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_timeline_goals_priority ON timeline_goals(priority);

-- Timeline Goal Items indexes
CREATE INDEX IF NOT EXISTS idx_timeline_goal_items_goal_id ON timeline_goal_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_timeline_goal_items_item_id ON timeline_goal_items(item_id);

-- Timeline AI Sessions indexes
CREATE INDEX IF NOT EXISTS idx_timeline_ai_sessions_user_id ON timeline_ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_ai_sessions_created_at ON timeline_ai_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_ai_sessions_type ON timeline_ai_sessions(session_type);

-- Timeline Items new column indexes
CREATE INDEX IF NOT EXISTS idx_timeline_items_parent_id ON timeline_items(parent_item_id) WHERE parent_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_items_template_id ON timeline_items(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_items_locked ON timeline_items(is_locked_time) WHERE is_locked_time = TRUE;

-- Timeline Layers new column indexes
CREATE INDEX IF NOT EXISTS idx_timeline_layers_type ON timeline_layers(timeline_type);

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE timeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_goal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_ai_sessions ENABLE ROW LEVEL SECURITY;

-- Timeline Templates Policies
CREATE POLICY "Users can view their own templates and system defaults"
  ON timeline_templates FOR SELECT
  USING (auth.uid() = user_id OR is_system_default = TRUE);

CREATE POLICY "Users can insert their own templates"
  ON timeline_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON timeline_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON timeline_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system_default = FALSE);

-- Timeline Goals Policies
CREATE POLICY "Users can view their own goals"
  ON timeline_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON timeline_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON timeline_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON timeline_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Timeline Goal Items Policies
CREATE POLICY "Users can view goal items for their goals"
  ON timeline_goal_items FOR SELECT
  USING (
    goal_id IN (SELECT id FROM timeline_goals WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert goal items for their goals"
  ON timeline_goal_items FOR INSERT
  WITH CHECK (
    goal_id IN (SELECT id FROM timeline_goals WHERE user_id = auth.uid()) AND
    item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update goal items for their goals"
  ON timeline_goal_items FOR UPDATE
  USING (
    goal_id IN (SELECT id FROM timeline_goals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    goal_id IN (SELECT id FROM timeline_goals WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete goal items for their goals"
  ON timeline_goal_items FOR DELETE
  USING (
    goal_id IN (SELECT id FROM timeline_goals WHERE user_id = auth.uid())
  );

-- Timeline AI Sessions Policies
CREATE POLICY "Users can view their own AI sessions"
  ON timeline_ai_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI sessions"
  ON timeline_ai_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI sessions"
  ON timeline_ai_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 5: TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Timeline Templates trigger
CREATE TRIGGER timeline_templates_updated_at
  BEFORE UPDATE ON timeline_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_layers_updated_at();

-- Timeline Goals trigger
CREATE TRIGGER timeline_goals_updated_at
  BEFORE UPDATE ON timeline_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_layers_updated_at();

-- Note: Reusing existing update_timeline_layers_updated_at function
-- which just sets NEW.updated_at = NOW()

-- ============================================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate total hours for a goal
CREATE OR REPLACE FUNCTION calculate_goal_hours_completed(p_goal_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_hours NUMERIC;
BEGIN
  SELECT COALESCE(SUM(contribution_hours), 0)
  INTO v_total_hours
  FROM timeline_goal_items
  WHERE goal_id = p_goal_id;

  RETURN v_total_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update goal hours when goal items change
CREATE OR REPLACE FUNCTION update_goal_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE timeline_goals
  SET hours_completed = calculate_goal_hours_completed(NEW.goal_id),
      updated_at = NOW()
  WHERE id = NEW.goal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update goal hours
CREATE TRIGGER update_goal_hours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON timeline_goal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_hours();

-- Function to validate magnetic timeline continuity (24 hours, no gaps)
CREATE OR REPLACE FUNCTION validate_magnetic_timeline_continuity(p_layer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_minutes INTEGER;
  v_item_count INTEGER;
  v_layer_type TEXT;
  v_result JSONB;
BEGIN
  -- Get layer type
  SELECT timeline_type INTO v_layer_type
  FROM timeline_layers
  WHERE id = p_layer_id;

  -- Only validate for magnetic timelines
  IF v_layer_type != 'magnetic' THEN
    RETURN jsonb_build_object(
      'valid', TRUE,
      'message', 'Not a magnetic timeline'
    );
  END IF;

  -- Calculate total duration
  SELECT
    COUNT(*),
    COALESCE(SUM(duration_minutes), 0)
  INTO v_item_count, v_total_minutes
  FROM timeline_items
  WHERE layer_id = p_layer_id
    AND status != 'parked';

  -- Check if equals 24 hours (1440 minutes)
  IF v_total_minutes = 1440 THEN
    RETURN jsonb_build_object(
      'valid', TRUE,
      'total_minutes', v_total_minutes,
      'item_count', v_item_count,
      'message', 'Timeline is exactly 24 hours'
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', FALSE,
      'total_minutes', v_total_minutes,
      'expected_minutes', 1440,
      'difference_minutes', v_total_minutes - 1440,
      'item_count', v_item_count,
      'message', format('Timeline is %s minutes %s than 24 hours',
        ABS(v_total_minutes - 1440),
        CASE WHEN v_total_minutes > 1440 THEN 'longer' ELSE 'shorter' END
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE timeline_templates IS 'Reusable timeline item templates (sleep, meals, exercise, etc.) for quick scheduling';
COMMENT ON TABLE timeline_goals IS 'User goals with target dates and progress tracking';
COMMENT ON TABLE timeline_goal_items IS 'Links timeline items to goals for progress tracking';
COMMENT ON TABLE timeline_ai_sessions IS 'History of AI planning sessions for analytics and learning';

COMMENT ON COLUMN timeline_templates.is_system_default IS 'System-provided templates cannot be deleted by users';
COMMENT ON COLUMN timeline_goals.hours_completed IS 'Automatically calculated from linked timeline_goal_items';
COMMENT ON COLUMN timeline_ai_sessions.metadata IS 'Stores AI model info, tokens used, parameters, etc.';
