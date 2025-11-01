-- Create Daily Planning System
-- Created: 2025-11-02
-- Purpose: Sunsama-style daily planning ritual with streaks and celebrations

-- Daily planning settings (user preferences)
CREATE TABLE IF NOT EXISTS daily_planning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Planning time preferences
  planning_time TIME DEFAULT '09:00:00' NOT NULL,
  duration_minutes INTEGER DEFAULT 15 NOT NULL CHECK (duration_minutes > 0),
  skip_weekends BOOLEAN DEFAULT false NOT NULL,

  -- Planning steps to include
  review_yesterday BOOLEAN DEFAULT true NOT NULL,
  import_calendar BOOLEAN DEFAULT true NOT NULL,
  set_priorities BOOLEAN DEFAULT true NOT NULL,
  check_workload BOOLEAN DEFAULT true NOT NULL,

  -- Notification preferences
  enable_notifications BOOLEAN DEFAULT true NOT NULL,
  snooze_duration_minutes INTEGER DEFAULT 15 NOT NULL,

  -- Quick planning option
  quick_planning_enabled BOOLEAN DEFAULT true NOT NULL,

  -- End-of-day shutdown
  shutdown_time TIME DEFAULT '17:00:00',
  enable_shutdown_ritual BOOLEAN DEFAULT true NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Daily planning sessions (tracking when user completes planning)
CREATE TABLE IF NOT EXISTS daily_planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  planning_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  is_quick_planning BOOLEAN DEFAULT false NOT NULL,

  -- What was done in this session
  reviewed_yesterday BOOLEAN DEFAULT false,
  imported_calendar BOOLEAN DEFAULT false,
  set_priorities BOOLEAN DEFAULT false,
  checked_workload BOOLEAN DEFAULT false,
  committed_schedule BOOLEAN DEFAULT false,

  -- Yesterday's stats
  yesterday_completed_count INTEGER DEFAULT 0,
  yesterday_total_count INTEGER DEFAULT 0,

  -- Today's plan
  priority_task_ids UUID[] DEFAULT ARRAY[]::UUID[],
  total_planned_minutes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one session per user per day
  CONSTRAINT unique_session_per_day UNIQUE (user_id, planning_date)
);

-- End-of-day shutdown sessions
CREATE TABLE IF NOT EXISTS daily_shutdown_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  shutdown_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,

  -- Stats from today
  tasks_completed INTEGER DEFAULT 0 NOT NULL,
  tasks_total INTEGER DEFAULT 0 NOT NULL,
  minutes_worked INTEGER DEFAULT 0,

  -- What's moving to tomorrow
  moved_to_tomorrow UUID[] DEFAULT ARRAY[]::UUID[],

  -- User reflections
  wins TEXT[] DEFAULT ARRAY[]::TEXT[],
  challenges TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one shutdown per user per day
  CONSTRAINT unique_shutdown_per_day UNIQUE (user_id, shutdown_date)
);

-- Planning streaks (calculated view)
CREATE OR REPLACE VIEW planning_streaks AS
WITH daily_sessions AS (
  SELECT
    user_id,
    planning_date,
    completed_at IS NOT NULL as completed,
    LAG(planning_date) OVER (PARTITION BY user_id ORDER BY planning_date) as prev_date
  FROM daily_planning_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY user_id, planning_date
),
streak_groups AS (
  SELECT
    user_id,
    planning_date,
    completed,
    SUM(CASE
      WHEN prev_date IS NULL OR planning_date - prev_date > 1 THEN 1
      ELSE 0
    END) OVER (PARTITION BY user_id ORDER BY planning_date) as streak_group
  FROM daily_sessions
),
streak_calculations AS (
  SELECT
    user_id,
    streak_group,
    MIN(planning_date) as streak_start,
    MAX(planning_date) as streak_end,
    COUNT(*) as streak_length
  FROM streak_groups
  WHERE completed = true
  GROUP BY user_id, streak_group
)
SELECT
  user_id,
  MAX(streak_length) as longest_streak,
  (
    SELECT streak_length
    FROM streak_calculations sc2
    WHERE sc2.user_id = sc.user_id
      AND sc2.streak_end = (SELECT MAX(planning_date) FROM daily_planning_sessions WHERE user_id = sc.user_id AND completed_at IS NOT NULL)
    LIMIT 1
  ) as current_streak,
  COUNT(DISTINCT streak_group) as total_streaks
FROM streak_calculations sc
GROUP BY user_id;

-- Enable RLS
ALTER TABLE daily_planning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_shutdown_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_planning_settings
CREATE POLICY "Users can view their own planning settings"
  ON daily_planning_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planning settings"
  ON daily_planning_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning settings"
  ON daily_planning_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_planning_sessions
CREATE POLICY "Users can view their own planning sessions"
  ON daily_planning_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planning sessions"
  ON daily_planning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning sessions"
  ON daily_planning_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planning sessions"
  ON daily_planning_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_shutdown_sessions
CREATE POLICY "Users can view their own shutdown sessions"
  ON daily_shutdown_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shutdown sessions"
  ON daily_shutdown_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shutdown sessions"
  ON daily_shutdown_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planning_settings_user_id
  ON daily_planning_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_user_date
  ON daily_planning_sessions(user_id, planning_date DESC);

CREATE INDEX IF NOT EXISTS idx_shutdown_sessions_user_date
  ON daily_shutdown_sessions(user_id, shutdown_date DESC);

-- Function to create default planning settings for new users
CREATE OR REPLACE FUNCTION create_default_planning_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_planning_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default settings when user signs up
CREATE TRIGGER create_planning_settings_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_planning_settings();

-- Function to check if planning is needed today
CREATE OR REPLACE FUNCTION planning_needed_today(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  dow INTEGER := EXTRACT(DOW FROM today_date);
  settings RECORD;
  session_exists BOOLEAN;
BEGIN
  -- Get user settings
  SELECT * INTO settings
  FROM daily_planning_settings
  WHERE user_id = p_user_id;

  -- If no settings, planning is needed
  IF settings IS NULL THEN
    RETURN true;
  END IF;

  -- Check if should skip weekends (0 = Sunday, 6 = Saturday)
  IF settings.skip_weekends AND (dow = 0 OR dow = 6) THEN
    RETURN false;
  END IF;

  -- Check if session already exists for today
  SELECT EXISTS(
    SELECT 1 FROM daily_planning_sessions
    WHERE user_id = p_user_id
      AND planning_date = today_date
      AND completed_at IS NOT NULL
  ) INTO session_exists;

  RETURN NOT session_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current streak
CREATE OR REPLACE FUNCTION get_current_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE - 1; -- Start from yesterday
  session_exists BOOLEAN;
BEGIN
  -- Count consecutive days backwards
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM daily_planning_sessions
      WHERE user_id = p_user_id
        AND planning_date = check_date
        AND completed_at IS NOT NULL
    ) INTO session_exists;

    EXIT WHEN NOT session_exists;

    streak_count := streak_count + 1;
    check_date := check_date - 1;

    -- Safety limit
    EXIT WHEN streak_count > 365;
  END LOOP;

  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE daily_planning_settings IS 'User preferences for daily planning ritual';
COMMENT ON TABLE daily_planning_sessions IS 'Tracks when users complete their daily planning';
COMMENT ON TABLE daily_shutdown_sessions IS 'Tracks end-of-day shutdown rituals';
COMMENT ON VIEW planning_streaks IS 'Calculates planning streaks for gamification';
