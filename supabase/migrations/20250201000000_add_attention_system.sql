-- 3-2-1 Attention System Migration
-- This migration adds attention-based productivity features to the timeline system

-- Add attention fields to existing timeline_items table
ALTER TABLE timeline_items ADD COLUMN attention_type TEXT
  CHECK (attention_type IN ('create', 'decide', 'connect', 'review', 'recover'));
ALTER TABLE timeline_items ADD COLUMN priority INTEGER
  CHECK (priority BETWEEN 1 AND 5);
ALTER TABLE timeline_items ADD COLUMN is_non_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE timeline_items ADD COLUMN notes TEXT;
ALTER TABLE timeline_items ADD COLUMN tags TEXT[];
ALTER TABLE timeline_items ADD COLUMN context_switch_cost INTEGER DEFAULT 0;

-- Create user attention preferences table
CREATE TABLE IF NOT EXISTS user_attention_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_role TEXT NOT NULL DEFAULT 'maker'
    CHECK (current_role IN ('maker', 'marker', 'multiplier')),
  current_zone TEXT NOT NULL DEFAULT 'peacetime'
    CHECK (current_zone IN ('wartime', 'peacetime')),
  non_negotiable_title TEXT,
  non_negotiable_weekly_hours INTEGER DEFAULT 5
    CHECK (non_negotiable_weekly_hours >= 0 AND non_negotiable_weekly_hours <= 168),
  attention_budgets JSONB DEFAULT '{"decide": 2, "context_switches": 3, "meetings": 4}',
  peak_hours_start TIME DEFAULT '09:00',
  peak_hours_end TIME DEFAULT '12:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create delegations table for trust management workflow
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  trust_level TEXT NOT NULL DEFAULT 'new'
    CHECK (trust_level IN ('new', 'experienced', 'expert')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  follow_up_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attention_budget_tracking for daily budget monitoring
CREATE TABLE IF NOT EXISTS attention_budget_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  attention_type TEXT NOT NULL,
  budget_used INTEGER NOT NULL DEFAULT 0,
  budget_limit INTEGER NOT NULL,
  context_switches INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One budget tracking per user per date per attention type
  UNIQUE(user_id, date, attention_type)
);

-- Add indexes for attention system queries
CREATE INDEX idx_timeline_items_attention_type ON timeline_items(attention_type);
CREATE INDEX idx_timeline_items_priority ON timeline_items(priority);
CREATE INDEX idx_timeline_items_is_non_negotiable ON timeline_items(is_non_negotiable);
CREATE INDEX idx_timeline_items_user_attention ON timeline_items(user_id, attention_type, start_time);
CREATE INDEX idx_user_attention_preferences_user ON user_attention_preferences(user_id);
CREATE INDEX idx_delegations_delegator ON delegations(delegator_id, status);
CREATE INDEX idx_delegations_delegate ON delegations(delegate_id, status);
CREATE INDEX idx_attention_budget_tracking_user_date ON attention_budget_tracking(user_id, date);

-- Enable Row Level Security for new tables
ALTER TABLE user_attention_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attention_budget_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_attention_preferences
CREATE POLICY "Users can view their own attention preferences"
  ON user_attention_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attention preferences"
  ON user_attention_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attention preferences"
  ON user_attention_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attention preferences"
  ON user_attention_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for delegations
CREATE POLICY "Users can view delegations they're involved in"
  ON delegations
  FOR SELECT
  USING (auth.uid() = delegator_id OR auth.uid() = delegate_id);

CREATE POLICY "Users can create delegations they send"
  ON delegations
  FOR INSERT
  WITH CHECK (auth.uid() = delegator_id);

CREATE POLICY "Users can update delegations they're involved in"
  ON delegations
  FOR UPDATE
  USING (auth.uid() = delegator_id OR auth.uid() = delegate_id)
  WITH CHECK (auth.uid() = delegator_id OR auth.uid() = delegate_id);

CREATE POLICY "Users can delete delegations they sent"
  ON delegations
  FOR DELETE
  USING (auth.uid() = delegator_id);

-- RLS Policies for attention_budget_tracking
CREATE POLICY "Users can view their own budget tracking"
  ON attention_budget_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget tracking"
  ON attention_budget_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget tracking"
  ON attention_budget_tracking
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget tracking"
  ON attention_budget_tracking
  FOR DELETE
  USING (auth.uid() = user_id);

-- Functions to update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_user_attention_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_delegations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_attention_budget_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER user_attention_preferences_updated_at
  BEFORE UPDATE ON user_attention_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_attention_preferences_updated_at();

CREATE TRIGGER delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW
  EXECUTE FUNCTION update_delegations_updated_at();

CREATE TRIGGER attention_budget_tracking_updated_at
  BEFORE UPDATE ON attention_budget_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_attention_budget_tracking_updated_at();

-- Helper function to get user's current attention preferences
CREATE OR REPLACE FUNCTION get_user_attention_preferences(p_user_id UUID)
RETURNS user_attention_preferences AS $$
DECLARE
  prefs user_attention_preferences;
BEGIN
  SELECT * INTO prefs
  FROM user_attention_preferences
  WHERE user_id = p_user_id;

  -- Create default preferences if none exist
  IF NOT FOUND THEN
    INSERT INTO user_attention_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO prefs;
  END IF;

  RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate daily attention budget usage
CREATE OR REPLACE FUNCTION get_daily_attention_usage(
  p_user_id UUID,
  p_date DATE,
  p_attention_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  attention_type TEXT,
  items_count INTEGER,
  total_duration_minutes INTEGER,
  context_switches INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ti.attention_type,
    COUNT(ti.id)::INTEGER as items_count,
    SUM(ti.duration_minutes)::INTEGER as total_duration_minutes,
    COUNT(CASE WHEN ti.context_switch_cost > 0 THEN 1 END)::INTEGER as context_switches
  FROM timeline_items ti
  WHERE ti.user_id = p_user_id
    AND DATE(ti.start_time) = p_date
    AND ti.attention_type IS NOT NULL
    AND (p_attention_type IS NULL OR ti.attention_type = p_attention_type)
  GROUP BY ti.attention_type
  ORDER BY ti.attention_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE user_attention_preferences IS 'User settings for role-based attention management and productivity optimization';
COMMENT ON TABLE delegations IS 'Task delegation workflow with trust levels and follow-up scheduling';
COMMENT ON TABLE attention_budget_tracking IS 'Daily tracking of attention budget usage by type';
COMMENT ON COLUMN timeline_items.attention_type IS 'Type of attention required: create, decide, connect, review, recover';
COMMENT ON COLUMN timeline_items.priority IS 'Item priority from 1 (lowest) to 5 (highest)';
COMMENT ON COLUMN timeline_items.is_non_negotiable IS 'Whether this item is the users protected non-negotiable priority';
COMMENT ON COLUMN timeline_items.context_switch_cost IS 'Estimated cognitive cost of context switching (0-10 scale)';