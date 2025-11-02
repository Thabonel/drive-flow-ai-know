-- ========================================
-- RUN THIS IN SUPABASE SQL EDITOR NOW
-- ========================================
-- This will forcefully replace the broken function

-- Step 1: Drop the broken function completely
DROP FUNCTION IF EXISTS get_daily_brief_data(UUID, DATE) CASCADE;

-- Step 2: Create the correct function
CREATE OR REPLACE FUNCTION get_daily_brief_data(p_user_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
          'end_time', start_time + (duration_minutes * INTERVAL '1 minute'),
          'duration_minutes', duration_minutes,
          'is_meeting', is_meeting
        )
      ), '[]'::JSONB)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
        AND is_meeting = true
        AND status != 'completed'
      ORDER BY start_time
    ),
    'tasks_due_today', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'duration_minutes', duration_minutes,
          'planned_duration_minutes', planned_duration_minutes,
          'start_time', start_time
        )
      ), '[]'::JSONB)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
        AND (is_meeting = false OR is_meeting IS NULL)
        AND status != 'completed'
      ORDER BY start_time
    ),
    'schedule_overview', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'start_time', start_time,
          'end_time', start_time + (duration_minutes * INTERVAL '1 minute'),
          'duration_minutes', duration_minutes,
          'is_meeting', is_meeting,
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
$$;

-- Step 3: Add comment
COMMENT ON FUNCTION get_daily_brief_data(UUID, DATE) IS
'Retrieves daily brief data. Fixed: No GROUP BY - uses jsonb_agg directly.';

-- Step 4: Test the function (replace with your user_id)
-- SELECT get_daily_brief_data('your-user-id-here'::UUID, CURRENT_DATE);
