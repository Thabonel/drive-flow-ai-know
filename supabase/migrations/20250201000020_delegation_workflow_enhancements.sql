-- Delegation Workflow System Enhancements
-- This migration adds comprehensive delegation workflow features with trust management

-- Extend existing delegations table with additional workflow fields
ALTER TABLE delegations
ADD COLUMN IF NOT EXISTS estimated_hours FLOAT,
ADD COLUMN IF NOT EXISTS actual_hours FLOAT,
ADD COLUMN IF NOT EXISTS success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS follow_up_events UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS completion_percentage FLOAT DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update the status enum to include blocked
ALTER TABLE delegations DROP CONSTRAINT IF EXISTS delegations_status_check;
ALTER TABLE delegations ADD CONSTRAINT delegations_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled'));

-- Create router_inbox table for Multiplier mode request triage
CREATE TABLE IF NOT EXISTS router_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_from TEXT NOT NULL, -- Could be external email, team member name, etc.
  request_content TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('meeting', 'task', 'question', 'decision', 'approval')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'routed', 'scheduled', 'declined', 'responded', 'converted')),
  routed_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  routing_context TEXT,
  estimated_effort_hours FLOAT,
  deadline TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  response_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delegation_follow_ups table for tracking follow-up events
CREATE TABLE IF NOT EXISTS delegation_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('work_alongside', 'review_steps', 'unblock_context', 'completion_review')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delegation_analytics table for tracking success patterns
CREATE TABLE IF NOT EXISTS delegation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  delegations_created INTEGER DEFAULT 0,
  delegations_completed INTEGER DEFAULT 0,
  average_success_rating FLOAT,
  trust_level_breakdown JSONB DEFAULT '{"new": 0, "experienced": 0, "expert": 0}',
  total_hours_delegated FLOAT DEFAULT 0,
  total_hours_saved FLOAT DEFAULT 0, -- Estimated time saved through delegation
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Create team_workload_indicators table for tracking team capacity
CREATE TABLE IF NOT EXISTS team_workload_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  scheduled_hours FLOAT DEFAULT 0,
  delegated_hours FLOAT DEFAULT 0,
  availability_hours FLOAT DEFAULT 8, -- Default 8-hour workday
  workload_percentage FLOAT GENERATED ALWAYS AS (
    CASE
      WHEN availability_hours > 0 THEN LEAST(((scheduled_hours + delegated_hours) / availability_hours) * 100, 200)
      ELSE 0
    END
  ) STORED,
  skills JSONB DEFAULT '{}', -- Skill categories and proficiency levels
  current_focus_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, member_user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_router_inbox_user_status ON router_inbox(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_router_inbox_priority ON router_inbox(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delegation_follow_ups_delegation ON delegation_follow_ups(delegation_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_delegation_follow_ups_scheduled ON delegation_follow_ups(scheduled_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delegation_analytics_user_date ON delegation_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_team_workload_indicators_team_date ON team_workload_indicators(team_id, date);
CREATE INDEX IF NOT EXISTS idx_delegations_trust_level ON delegations(trust_level, status);
CREATE INDEX IF NOT EXISTS idx_delegations_completion ON delegations(delegator_id, status, created_at DESC);

-- Enable Row Level Security for new tables
ALTER TABLE router_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workload_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for router_inbox
CREATE POLICY "Users can manage their own router inbox"
  ON router_inbox
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow team members to view routed requests
CREATE POLICY "Team members can view requests routed to them"
  ON router_inbox
  FOR SELECT
  USING (auth.uid() = routed_to);

-- RLS Policies for delegation_follow_ups
CREATE POLICY "Users can view follow-ups for their delegations"
  ON delegation_follow_ups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delegations d
      WHERE d.id = delegation_id
      AND (d.delegator_id = auth.uid() OR d.delegate_id = auth.uid())
    )
  );

CREATE POLICY "Delegators can manage follow-ups"
  ON delegation_follow_ups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM delegations d
      WHERE d.id = delegation_id
      AND d.delegator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delegations d
      WHERE d.id = delegation_id
      AND d.delegator_id = auth.uid()
    )
  );

-- RLS Policies for delegation_analytics
CREATE POLICY "Users can manage their own delegation analytics"
  ON delegation_analytics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for team_workload_indicators
CREATE POLICY "Team members can view workload indicators for their teams"
  ON team_workload_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_workload_indicators.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leads can manage workload indicators"
  ON team_workload_indicators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_workload_indicators.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'lead')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_workload_indicators.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'lead')
    )
  );

-- Create triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_router_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER router_inbox_updated_at
  BEFORE UPDATE ON router_inbox
  FOR EACH ROW
  EXECUTE FUNCTION update_router_inbox_updated_at();

-- Function to automatically create delegation follow-ups based on trust level
CREATE OR REPLACE FUNCTION create_delegation_follow_ups(p_delegation_id UUID)
RETURNS VOID AS $$
DECLARE
  delegation_record delegations;
  follow_up_schedule JSONB;
BEGIN
  -- Get delegation details
  SELECT * INTO delegation_record FROM delegations WHERE id = p_delegation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delegation not found: %', p_delegation_id;
  END IF;

  -- Define follow-up schedules based on trust level
  CASE delegation_record.trust_level
    WHEN 'new' THEN
      -- Work alongside: 2 hours, then daily check-ins
      INSERT INTO delegation_follow_ups (delegation_id, follow_up_type, scheduled_at)
      VALUES
        (p_delegation_id, 'work_alongside', delegation_record.created_at + INTERVAL '2 hours'),
        (p_delegation_id, 'review_steps', delegation_record.created_at + INTERVAL '1 day'),
        (p_delegation_id, 'review_steps', delegation_record.created_at + INTERVAL '2 days');

    WHEN 'experienced' THEN
      -- Review steps: 25% and 75% checkpoints
      INSERT INTO delegation_follow_ups (delegation_id, follow_up_type, scheduled_at)
      VALUES
        (p_delegation_id, 'review_steps', delegation_record.created_at + INTERVAL '1 day'),
        (p_delegation_id, 'review_steps', delegation_record.created_at + INTERVAL '3 days');

    WHEN 'expert' THEN
      -- Unblock/provide context: start only
      INSERT INTO delegation_follow_ups (delegation_id, follow_up_type, scheduled_at)
      VALUES
        (p_delegation_id, 'unblock_context', delegation_record.created_at + INTERVAL '30 minutes');
  END CASE;

  -- Update delegation with follow-up event IDs
  UPDATE delegations
  SET follow_up_events = ARRAY(
    SELECT id FROM delegation_follow_ups
    WHERE delegation_id = p_delegation_id
  )
  WHERE id = p_delegation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate delegation success metrics
CREATE OR REPLACE FUNCTION calculate_delegation_success_rate(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_delegations INTEGER,
  completed_delegations INTEGER,
  success_rate FLOAT,
  average_rating FLOAT,
  trust_level_breakdown JSONB,
  avg_completion_time_hours FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_delegations,
    COUNT(CASE WHEN d.status = 'completed' THEN 1 END)::INTEGER as completed_delegations,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN d.status = 'completed' THEN 1 END)::FLOAT / COUNT(*)::FLOAT) * 100
      ELSE 0
    END as success_rate,
    AVG(d.success_rating) as average_rating,
    jsonb_build_object(
      'new', COUNT(CASE WHEN d.trust_level = 'new' THEN 1 END),
      'experienced', COUNT(CASE WHEN d.trust_level = 'experienced' THEN 1 END),
      'expert', COUNT(CASE WHEN d.trust_level = 'expert' THEN 1 END)
    ) as trust_level_breakdown,
    AVG(EXTRACT(epoch FROM (d.completed_at - d.created_at)) / 3600) as avg_completion_time_hours
  FROM delegations d
  WHERE d.delegator_id = p_user_id
    AND DATE(d.created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team workload summary
CREATE OR REPLACE FUNCTION get_team_workload_summary(
  p_team_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  member_user_id UUID,
  member_name TEXT,
  workload_percentage FLOAT,
  available_hours FLOAT,
  skills JSONB,
  current_focus_area TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    twi.member_user_id,
    COALESCE(
      (u.raw_user_meta_data->>'full_name')::TEXT,
      u.email,
      'Unknown User'
    ) as member_name,
    twi.workload_percentage,
    twi.availability_hours - twi.scheduled_hours - twi.delegated_hours as available_hours,
    twi.skills,
    twi.current_focus_area
  FROM team_workload_indicators twi
  JOIN auth.users u ON u.id = twi.member_user_id
  WHERE twi.team_id = p_team_id
    AND twi.date = p_date
  ORDER BY twi.workload_percentage ASC, member_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suggest optimal delegation targets
CREATE OR REPLACE FUNCTION suggest_delegation_targets(
  p_team_id UUID,
  p_required_skills TEXT[] DEFAULT '{}',
  p_estimated_hours FLOAT DEFAULT 1.0,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  member_user_id UUID,
  member_name TEXT,
  current_workload FLOAT,
  available_hours FLOAT,
  skill_match_score INTEGER,
  recommended_trust_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    twi.member_user_id,
    COALESCE(
      (u.raw_user_meta_data->>'full_name')::TEXT,
      u.email,
      'Unknown User'
    ) as member_name,
    twi.workload_percentage,
    twi.availability_hours - twi.scheduled_hours - twi.delegated_hours as available_hours,
    CASE
      WHEN array_length(p_required_skills, 1) IS NULL THEN 5
      ELSE (
        SELECT COUNT(*)::INTEGER
        FROM unnest(p_required_skills) AS required_skill
        WHERE twi.skills ? required_skill
      )
    END as skill_match_score,
    -- Simple heuristic for recommended trust level based on past performance
    CASE
      WHEN twi.workload_percentage < 50 AND jsonb_array_length(COALESCE(twi.skills, '{}')) > 3 THEN 'expert'
      WHEN twi.workload_percentage < 75 THEN 'experienced'
      ELSE 'new'
    END as recommended_trust_level
  FROM team_workload_indicators twi
  JOIN auth.users u ON u.id = twi.member_user_id
  WHERE twi.team_id = p_team_id
    AND twi.date = p_date
    AND (twi.availability_hours - twi.scheduled_hours - twi.delegated_hours) >= p_estimated_hours
  ORDER BY
    skill_match_score DESC,
    twi.workload_percentage ASC,
    member_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE router_inbox IS 'Centralized inbox for managing incoming requests in Multiplier mode';
COMMENT ON TABLE delegation_follow_ups IS 'Scheduled follow-up events for delegation workflow based on trust levels';
COMMENT ON TABLE delegation_analytics IS 'Daily aggregated metrics for delegation success tracking';
COMMENT ON TABLE team_workload_indicators IS 'Real-time workload and capacity tracking for team members';

COMMENT ON FUNCTION create_delegation_follow_ups IS 'Automatically schedules follow-up events when a delegation is created based on trust level';
COMMENT ON FUNCTION calculate_delegation_success_rate IS 'Calculates delegation success metrics for analytics dashboard';
COMMENT ON FUNCTION get_team_workload_summary IS 'Provides current workload overview for all team members';
COMMENT ON FUNCTION suggest_delegation_targets IS 'AI-powered suggestion engine for optimal delegation targets based on workload and skills';