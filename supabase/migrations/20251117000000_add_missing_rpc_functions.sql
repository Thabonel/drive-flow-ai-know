-- Add missing RPC functions for daily planning
-- These functions should exist from 20251102000010_create_daily_planning.sql
-- but are being added here to ensure they exist

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
