-- ================================================================
-- STEP 1: VERIFY CURRENT FUNCTION
-- ================================================================
-- Run this first to see what the current function looks like
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_daily_brief_data';

-- ================================================================
-- STEP 2: DROP ALL VERSIONS
-- ================================================================
-- Drop any and all versions of this function
DROP FUNCTION IF EXISTS get_daily_brief_data(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_daily_brief_data(UUID, DATE) CASCADE;

-- ================================================================
-- STEP 3: CREATE CORRECT VERSION
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_daily_brief_data(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Build the complete result as a single JSONB object
  -- Using subqueries with jsonb_agg - NO GROUP BY needed
  SELECT jsonb_build_object(
    'priority_meetings', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'start_time', start_time,
            'end_time', start_time + (duration_minutes * INTERVAL '1 minute'),
            'duration_minutes', duration_minutes,
            'is_meeting', is_meeting
          )
          ORDER BY start_time
        ),
        '[]'::JSONB
      )
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
        AND is_meeting = true
        AND status != 'completed'
    ),
    'tasks_due_today', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'duration_minutes', duration_minutes,
            'planned_duration_minutes', planned_duration_minutes,
            'start_time', start_time
          )
          ORDER BY start_time
        ),
        '[]'::JSONB
      )
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
        AND (is_meeting = false OR is_meeting IS NULL)
        AND status != 'completed'
    ),
    'schedule_overview', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'start_time', start_time,
            'end_time', start_time + (duration_minutes * INTERVAL '1 minute'),
            'duration_minutes', duration_minutes,
            'is_meeting', is_meeting,
            'status', status
          )
          ORDER BY start_time
        ),
        '[]'::JSONB
      )
      FROM timeline_items
      WHERE user_id = p_user_id
        AND DATE(start_time) = p_date
    ),
    'pending_email_tasks', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', et.id,
            'title', et.title,
            'priority', et.ai_priority,
            'from_email', re.from_email
          )
        ),
        '[]'::JSONB
      )
      FROM email_tasks et
      LEFT JOIN received_emails re ON re.id = et.email_id
      WHERE et.user_id = p_user_id
        AND et.status = 'pending'
      ORDER BY et.ai_priority DESC
      LIMIT 10
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ================================================================
-- STEP 4: ADD COMMENT
-- ================================================================
COMMENT ON FUNCTION public.get_daily_brief_data(UUID, DATE) IS
'Retrieves daily brief data including meetings, tasks, schedule, and email tasks.
Fixed: Uses jsonb_agg with ORDER BY - no GROUP BY clause needed.
Updated: Improved email_tasks join to avoid correlated subquery.';

-- ================================================================
-- STEP 5: GRANT PERMISSIONS
-- ================================================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_brief_data(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_brief_data(UUID, DATE) TO service_role;

-- ================================================================
-- STEP 6: TEST THE FUNCTION
-- ================================================================
-- Replace 'your-user-id' with your actual user ID
-- SELECT public.get_daily_brief_data('your-user-id'::UUID, CURRENT_DATE);
