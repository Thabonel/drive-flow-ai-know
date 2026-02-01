-- Advanced Attention Budget Management System Enhancement
-- This migration adds the advanced features for real-time budget monitoring,
-- context switch cost engine, focus protection, and attention pattern analytics

-- Enhanced attention budget tracking with real-time monitoring
CREATE TABLE IF NOT EXISTS attention_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly')),
  pattern_data JSONB NOT NULL DEFAULT '{}',
  effectiveness_score FLOAT CHECK (effectiveness_score BETWEEN 0 AND 100),
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for pattern queries
  UNIQUE(user_id, pattern_type, DATE(identified_at))
);

-- Focus session tracking for deep work optimization
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('deep_work', 'decision_batch', 'review_session', 'creative_flow')),
  planned_duration INTEGER NOT NULL,
  actual_duration INTEGER,
  interruptions INTEGER DEFAULT 0,
  completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 5),
  focus_quality_score FLOAT CHECK (focus_quality_score BETWEEN 0 AND 100),
  notes TEXT,
  protection_level TEXT DEFAULT 'normal' CHECK (protection_level IN ('minimal', 'normal', 'strict', 'maximum')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context switch cost tracking for intelligent optimization
CREATE TABLE IF NOT EXISTS context_switch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_item_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,
  to_item_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,
  from_attention_type TEXT NOT NULL,
  to_attention_type TEXT NOT NULL,
  switch_time TIMESTAMPTZ NOT NULL,
  cost_score FLOAT NOT NULL DEFAULT 0 CHECK (cost_score BETWEEN 0 AND 10),
  time_between_minutes INTEGER DEFAULT 0,
  cognitive_load_before INTEGER CHECK (cognitive_load_before BETWEEN 0 AND 10),
  cognitive_load_after INTEGER CHECK (cognitive_load_after BETWEEN 0 AND 10),
  role_mode TEXT NOT NULL CHECK (role_mode IN ('maker', 'marker', 'multiplier')),
  zone_mode TEXT DEFAULT 'peacetime' CHECK (zone_mode IN ('wartime', 'peacetime')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget violation alerts and warnings system
CREATE TABLE IF NOT EXISTS attention_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('budget_limit', 'context_switch', 'focus_fragmentation', 'peak_hours', 'decision_fatigue')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'blocking')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT,
  actionable BOOLEAN DEFAULT TRUE,
  severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
  affected_items UUID[] DEFAULT '{}',
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart scheduling suggestions and optimization
CREATE TABLE IF NOT EXISTS scheduling_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('reschedule', 'batch', 'delegate', 'optimize', 'skip', 'extend', 'split')),
  target_item_id UUID REFERENCES timeline_items(id) ON DELETE CASCADE,
  suggested_time TIMESTAMPTZ,
  suggested_duration INTEGER,
  reasoning TEXT NOT NULL,
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  potential_benefit TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  expires_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly attention patterns and calibration tracking
CREATE TABLE IF NOT EXISTS weekly_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  role_selected TEXT NOT NULL CHECK (role_selected IN ('maker', 'marker', 'multiplier')),
  zone_selected TEXT NOT NULL CHECK (zone_selected IN ('wartime', 'peacetime')),
  non_negotiable_title TEXT,
  non_negotiable_hours_planned INTEGER DEFAULT 5,
  non_negotiable_hours_actual FLOAT DEFAULT 0,
  role_fit_score INTEGER CHECK (role_fit_score BETWEEN 0 AND 100),
  attention_budget_planned JSONB DEFAULT '{}',
  attention_budget_actual JSONB DEFAULT '{}',
  completion_percentage FLOAT CHECK (completion_percentage BETWEEN 0 AND 100),
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  lessons_learned TEXT,
  optimization_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Ensure one calibration per user per week
  UNIQUE(user_id, week_start_date)
);

-- Budget violation prevention and enforcement
CREATE TABLE IF NOT EXISTS budget_enforcement_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('hard_limit', 'warning_threshold', 'auto_suggestion', 'blocking')),
  attention_type TEXT NOT NULL,
  threshold_value INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('warn', 'block', 'suggest_alternative', 'auto_reschedule')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate rules
  UNIQUE(user_id, rule_type, attention_type)
);

-- Extend user_attention_preferences with advanced settings
ALTER TABLE user_attention_preferences
ADD COLUMN IF NOT EXISTS budget_enforcement_mode TEXT DEFAULT 'advisory' CHECK (budget_enforcement_mode IN ('advisory', 'strict', 'automatic')),
ADD COLUMN IF NOT EXISTS context_switch_sensitivity INTEGER DEFAULT 5 CHECK (context_switch_sensitivity BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS focus_protection_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_optimization_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weekly_calibration_day INTEGER DEFAULT 1 CHECK (weekly_calibration_day BETWEEN 0 AND 6),
ADD COLUMN IF NOT EXISTS energy_tracking_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preferred_focus_duration INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS break_reminder_interval INTEGER DEFAULT 60;

-- Add advanced analytics columns to existing attention_budget_tracking
ALTER TABLE attention_budget_tracking
ADD COLUMN IF NOT EXISTS efficiency_score FLOAT CHECK (efficiency_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS interruption_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_vs_planned_ratio FLOAT,
ADD COLUMN IF NOT EXISTS peak_hours_utilization FLOAT;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_attention_patterns_user_type ON attention_patterns(user_id, pattern_type, identified_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, DATE(started_at));
CREATE INDEX IF NOT EXISTS idx_context_switch_events_user_time ON context_switch_events(user_id, switch_time);
CREATE INDEX IF NOT EXISTS idx_attention_warnings_user_active ON attention_warnings(user_id, created_at) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduling_suggestions_user_status ON scheduling_suggestions(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_calibrations_user_week ON weekly_calibrations(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_budget_enforcement_rules_user_active ON budget_enforcement_rules(user_id, is_active);

-- Enable Row Level Security for new tables
ALTER TABLE attention_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_switch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attention_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_enforcement_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attention_patterns
CREATE POLICY "Users can view their own attention patterns"
  ON attention_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attention patterns"
  ON attention_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attention patterns"
  ON attention_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attention patterns"
  ON attention_patterns FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for focus_sessions
CREATE POLICY "Users can view their own focus sessions"
  ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own focus sessions"
  ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own focus sessions"
  ON focus_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own focus sessions"
  ON focus_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for context_switch_events
CREATE POLICY "Users can view their own context switch events"
  ON context_switch_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own context switch events"
  ON context_switch_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for attention_warnings
CREATE POLICY "Users can view their own attention warnings"
  ON attention_warnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attention warnings"
  ON attention_warnings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attention warnings"
  ON attention_warnings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attention warnings"
  ON attention_warnings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scheduling_suggestions
CREATE POLICY "Users can view their own scheduling suggestions"
  ON scheduling_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scheduling suggestions"
  ON scheduling_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheduling suggestions"
  ON scheduling_suggestions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheduling suggestions"
  ON scheduling_suggestions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for weekly_calibrations
CREATE POLICY "Users can view their own weekly calibrations"
  ON weekly_calibrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weekly calibrations"
  ON weekly_calibrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weekly calibrations"
  ON weekly_calibrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weekly calibrations"
  ON weekly_calibrations FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for budget_enforcement_rules
CREATE POLICY "Users can view their own budget enforcement rules"
  ON budget_enforcement_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget enforcement rules"
  ON budget_enforcement_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget enforcement rules"
  ON budget_enforcement_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget enforcement rules"
  ON budget_enforcement_rules FOR DELETE USING (auth.uid() = user_id);

-- Advanced function for real-time budget violation checking
CREATE OR REPLACE FUNCTION check_budget_violation_real_time(
  p_user_id UUID,
  p_new_event JSONB,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  violation_type TEXT,
  severity TEXT,
  current_usage INTEGER,
  budget_limit INTEGER,
  projected_usage INTEGER,
  warning_message TEXT,
  suggested_action TEXT
) AS $$
DECLARE
  user_prefs user_attention_preferences;
  enforcement_rules RECORD;
  current_usage_value INTEGER;
  new_duration INTEGER;
  projected_total INTEGER;
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs FROM user_attention_preferences WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract new event details
  new_duration := COALESCE((p_new_event->>'duration_minutes')::INTEGER, 0);

  -- Check attention type budget
  IF p_new_event->>'attention_type' IS NOT NULL THEN
    -- Get current usage for this attention type
    SELECT COALESCE(SUM(duration_minutes), 0) INTO current_usage_value
    FROM timeline_items
    WHERE user_id = p_user_id
      AND DATE(start_time) = p_target_date
      AND attention_type = p_new_event->>'attention_type';

    projected_total := current_usage_value + new_duration;

    -- Check against budget limits
    -- (This would check against user_prefs.attention_budgets)
    -- For now, using default limits

    RETURN QUERY SELECT
      'attention_budget'::TEXT,
      CASE
        WHEN projected_total > current_usage_value * 1.2 THEN 'critical'::TEXT
        WHEN projected_total > current_usage_value * 1.1 THEN 'warning'::TEXT
        ELSE 'info'::TEXT
      END,
      current_usage_value,
      300, -- Default budget limit in minutes
      projected_total,
      format('Adding this %s task would bring total to %s minutes',
             p_new_event->>'attention_type', projected_total),
      'Consider rescheduling or delegating other tasks';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate context switch cost in real-time
CREATE OR REPLACE FUNCTION calculate_context_switch_cost(
  p_user_id UUID,
  p_from_type TEXT,
  p_to_type TEXT,
  p_time_between_minutes INTEGER DEFAULT 0,
  p_user_role TEXT DEFAULT 'maker'
)
RETURNS FLOAT AS $$
DECLARE
  base_cost FLOAT := 1.0;
  time_penalty FLOAT := 0.0;
  role_modifier FLOAT := 1.0;
BEGIN
  -- Base cost matrix between attention types
  IF p_from_type = p_to_type THEN
    RETURN 0.0; -- No switch cost for same type
  END IF;

  -- High-cost switches
  IF (p_from_type = 'create' AND p_to_type = 'connect') OR
     (p_from_type = 'connect' AND p_to_type = 'create') THEN
    base_cost := 3.0;
  ELSIF (p_from_type = 'decide' AND p_to_type IN ('create', 'review')) OR
        (p_to_type = 'decide' AND p_from_type IN ('create', 'review')) THEN
    base_cost := 2.5;
  ELSE
    base_cost := 1.5; -- Medium cost for other switches
  END IF;

  -- Time penalty - closer switches are more expensive
  IF p_time_between_minutes < 15 THEN
    time_penalty := 1.5;
  ELSIF p_time_between_minutes < 30 THEN
    time_penalty := 1.2;
  ELSIF p_time_between_minutes < 60 THEN
    time_penalty := 1.0;
  ELSE
    time_penalty := 0.8; -- Bonus for sufficient break time
  END IF;

  -- Role-based modifiers
  CASE p_user_role
    WHEN 'maker' THEN
      -- Makers are more sensitive to create interruptions
      IF p_from_type = 'create' THEN role_modifier := 1.5; END IF;
    WHEN 'marker' THEN
      -- Markers handle decision switches better
      IF p_from_type = 'decide' OR p_to_type = 'decide' THEN role_modifier := 0.8; END IF;
    WHEN 'multiplier' THEN
      -- Multipliers handle connect switches better
      IF p_from_type = 'connect' OR p_to_type = 'connect' THEN role_modifier := 0.7; END IF;
  END CASE;

  RETURN LEAST(10.0, base_cost * time_penalty * role_modifier);
END;
$$ LANGUAGE plpgsql;

-- Function to identify focus block protection opportunities
CREATE OR REPLACE FUNCTION identify_focus_protection_needs(
  p_user_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  timeline_item_id UUID,
  attention_type TEXT,
  duration_minutes INTEGER,
  protection_level TEXT,
  reasoning TEXT,
  suggested_buffer_before INTEGER,
  suggested_buffer_after INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ti.id,
    ti.attention_type,
    ti.duration_minutes,
    CASE
      WHEN ti.duration_minutes >= 180 THEN 'maximum'::TEXT
      WHEN ti.duration_minutes >= 120 THEN 'strict'::TEXT
      WHEN ti.duration_minutes >= 60 THEN 'normal'::TEXT
      ELSE 'minimal'::TEXT
    END as protection_level,
    CASE
      WHEN ti.duration_minutes >= 180 THEN 'Deep work session needs maximum protection'
      WHEN ti.duration_minutes >= 120 THEN 'Focus block should be strictly protected'
      WHEN ti.attention_type = 'create' THEN 'Creative work benefits from protection'
      ELSE 'Standard protection recommended'
    END as reasoning,
    CASE
      WHEN ti.duration_minutes >= 180 THEN 30
      WHEN ti.duration_minutes >= 120 THEN 15
      ELSE 5
    END as suggested_buffer_before,
    CASE
      WHEN ti.duration_minutes >= 180 THEN 30
      WHEN ti.duration_minutes >= 120 THEN 15
      ELSE 5
    END as suggested_buffer_after
  FROM timeline_items ti
  WHERE ti.user_id = p_user_id
    AND DATE(ti.start_time) = p_target_date
    AND ti.attention_type IN ('create', 'decide')
    AND ti.duration_minutes >= 60
  ORDER BY ti.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate smart scheduling suggestions
CREATE OR REPLACE FUNCTION generate_scheduling_suggestions(
  p_user_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  user_prefs user_attention_preferences;
  suggestion_record RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs FROM user_attention_preferences WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Clear old suggestions for the target date
  DELETE FROM scheduling_suggestions
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_target_date
    AND status = 'pending';

  -- Suggest batching similar attention types
  INSERT INTO scheduling_suggestions (
    user_id, suggestion_type, reasoning, confidence_score,
    potential_benefit, expires_at
  )
  SELECT
    p_user_id,
    'batch',
    format('Batch %s tasks together to reduce context switching', attention_type),
    0.8,
    'Reduced cognitive load and improved focus',
    (CURRENT_TIMESTAMP + INTERVAL '24 hours')
  FROM (
    SELECT attention_type, COUNT(*) as task_count
    FROM timeline_items
    WHERE user_id = p_user_id
      AND DATE(start_time) = p_target_date
      AND attention_type IS NOT NULL
    GROUP BY attention_type
    HAVING COUNT(*) >= 3
  ) batching_opportunities;

  -- Suggest moving high-attention work to peak hours
  INSERT INTO scheduling_suggestions (
    user_id, suggestion_type, target_item_id, reasoning,
    confidence_score, potential_benefit, expires_at
  )
  SELECT
    p_user_id,
    'reschedule',
    ti.id,
    format('Move %s work to peak hours (%s-%s) for better performance',
           ti.attention_type, user_prefs.peak_hours_start, user_prefs.peak_hours_end),
    0.7,
    'Improved focus and productivity during peak energy',
    (CURRENT_TIMESTAMP + INTERVAL '48 hours')
  FROM timeline_items ti
  WHERE ti.user_id = p_user_id
    AND DATE(ti.start_time) = p_target_date
    AND ti.attention_type IN ('create', 'decide')
    AND (
      EXTRACT(HOUR FROM ti.start_time) < EXTRACT(HOUR FROM user_prefs.peak_hours_start::time) OR
      EXTRACT(HOUR FROM ti.start_time) > EXTRACT(HOUR FROM user_prefs.peak_hours_end::time)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add table comments for documentation
COMMENT ON TABLE attention_patterns IS 'AI-identified patterns in user attention and productivity habits';
COMMENT ON TABLE focus_sessions IS 'Tracking and analysis of deep work focus sessions';
COMMENT ON TABLE context_switch_events IS 'Real-time tracking of attention type context switches and their costs';
COMMENT ON TABLE attention_warnings IS 'Real-time budget violation alerts and optimization warnings';
COMMENT ON TABLE scheduling_suggestions IS 'AI-generated smart scheduling optimization suggestions';
COMMENT ON TABLE weekly_calibrations IS 'Weekly planning ritual tracking and effectiveness analysis';
COMMENT ON TABLE budget_enforcement_rules IS 'User-configurable rules for budget violation prevention';