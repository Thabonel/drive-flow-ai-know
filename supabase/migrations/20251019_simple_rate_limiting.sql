-- Simple rate limiting for abuse prevention
-- 100 queries per hour for all users (prevents automated abuse)

CREATE OR REPLACE FUNCTION check_query_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_allowed BOOLEAN := TRUE;
  v_reason TEXT := '';
BEGIN
  -- Get usage for current hour
  SELECT * INTO v_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id
  AND period_start = DATE_TRUNC('month', NOW())
  LIMIT 1;

  -- If no usage record, allow (first query)
  IF v_usage IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'reason', '',
      'queries_this_hour', 0
    );
  END IF;

  -- Simple rate limit: 100 queries per hour (prevents bots)
  IF v_usage.queries_this_hour >= 100 AND
     v_usage.hour_window_start > (NOW() - INTERVAL '1 hour') THEN
    v_allowed := FALSE;
    v_reason := 'Rate limit exceeded (100 queries/hour)';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'queries_this_hour', COALESCE(v_usage.queries_this_hour, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_query_limit IS 'Simple rate limiting: 100 queries/hour for all users to prevent automated abuse';
