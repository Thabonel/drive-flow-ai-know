-- ================================================================
-- FINAL FIX: Remove ORDER BY that's causing GROUP BY requirement
-- ================================================================

DROP FUNCTION IF EXISTS public.get_daily_brief_data(UUID, DATE) CASCADE;

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
          ORDER BY start_time  -- ORDER BY inside jsonb_agg
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
          ORDER BY start_time  -- ORDER BY inside jsonb_agg
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
          ORDER BY start_time  -- ORDER BY inside jsonb_agg
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
            'id', task_data.id,
            'title', task_data.title,
            'priority', task_data.ai_priority,
            'from_email', task_data.from_email
          )
        ),
        '[]'::JSONB
      )
      FROM (
        SELECT
          et.id,
          et.title,
          et.ai_priority,
          re.from_email
        FROM email_tasks et
        LEFT JOIN received_emails re ON re.id = et.email_id
        WHERE et.user_id = p_user_id
          AND et.status = 'pending'
        ORDER BY et.ai_priority DESC
        LIMIT 10
      ) task_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_daily_brief_data(UUID, DATE) IS
'Retrieves daily brief data. Fixed: ORDER BY inside jsonb_agg, subquery for email tasks.';

GRANT EXECUTE ON FUNCTION public.get_daily_brief_data(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_brief_data(UUID, DATE) TO service_role;
