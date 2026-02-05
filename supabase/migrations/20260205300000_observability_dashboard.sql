-- Living Assistant: Observability Dashboard
-- Created: 2026-02-05
-- Purpose: Metrics, statistics, and cost tracking for dashboard

-- =============================================================================
-- PART 1: Usage tracking table
-- =============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Message counts by channel
  telegram_messages INTEGER NOT NULL DEFAULT 0,
  slack_messages INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,

  -- Message types
  text_messages INTEGER NOT NULL DEFAULT 0,
  voice_messages INTEGER NOT NULL DEFAULT 0,
  image_messages INTEGER NOT NULL DEFAULT 0,

  -- Proactive check-ins
  checkins_total INTEGER NOT NULL DEFAULT 0,
  checkins_skipped INTEGER NOT NULL DEFAULT 0,
  checkins_texted INTEGER NOT NULL DEFAULT 0,

  -- Memory operations
  memories_created INTEGER NOT NULL DEFAULT 0,
  memories_retrieved INTEGER NOT NULL DEFAULT 0,
  embeddings_generated INTEGER NOT NULL DEFAULT 0,

  -- API usage (for cost tracking)
  claude_api_calls INTEGER NOT NULL DEFAULT 0,
  claude_input_tokens INTEGER NOT NULL DEFAULT 0,
  claude_output_tokens INTEGER NOT NULL DEFAULT 0,
  openai_api_calls INTEGER NOT NULL DEFAULT 0,
  openai_tokens INTEGER NOT NULL DEFAULT 0,

  -- Autonomy tracking
  autonomy_sessions INTEGER NOT NULL DEFAULT 0,
  autonomy_total_minutes INTEGER NOT NULL DEFAULT 0,
  actions_taken INTEGER NOT NULL DEFAULT 0,

  -- Cost estimates (in cents)
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_user_period UNIQUE (user_id, period_start, period_type)
);

-- =============================================================================
-- PART 2: System health metrics
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Response times (ms)
  avg_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,

  -- Success rates
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,

  -- By function
  telegram_webhook_requests INTEGER NOT NULL DEFAULT 0,
  slack_webhook_requests INTEGER NOT NULL DEFAULT 0,
  proactive_checkin_requests INTEGER NOT NULL DEFAULT 0,
  memory_search_requests INTEGER NOT NULL DEFAULT 0,

  -- Errors
  error_count INTEGER NOT NULL DEFAULT 0,
  error_types JSONB DEFAULT '{}',

  -- Active users
  active_users_count INTEGER NOT NULL DEFAULT 0,
  active_sessions_count INTEGER NOT NULL DEFAULT 0
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_type);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded ON system_health_metrics(recorded_at DESC);

-- =============================================================================
-- PART 4: RLS Policies
-- =============================================================================
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage_tracking"
  ON usage_tracking FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage_tracking"
  ON usage_tracking FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage system_health_metrics"
  ON system_health_metrics FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- PART 5: Dashboard statistics functions
-- =============================================================================

-- Get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}';
  v_today_stats JSONB;
  v_week_stats JSONB;
  v_month_stats JSONB;
  v_memory_stats JSONB;
  v_autonomy_stats JSONB;
  v_recent_activity JSONB;
BEGIN
  -- Today's stats
  SELECT jsonb_build_object(
    'messages', COALESCE(SUM(total_messages), 0),
    'checkins', COALESCE(SUM(checkins_total), 0),
    'actions', COALESCE(SUM(actions_taken), 0)
  )
  INTO v_today_stats
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND period_type = 'daily'
    AND period_start = CURRENT_DATE;

  v_result := v_result || jsonb_build_object('today', COALESCE(v_today_stats, '{"messages":0,"checkins":0,"actions":0}'::jsonb));

  -- This week's stats
  SELECT jsonb_build_object(
    'messages', COALESCE(SUM(total_messages), 0),
    'checkins', COALESCE(SUM(checkins_total), 0),
    'actions', COALESCE(SUM(actions_taken), 0),
    'cost_cents', COALESCE(SUM(estimated_cost_cents), 0)
  )
  INTO v_week_stats
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND period_type = 'daily'
    AND period_start >= DATE_TRUNC('week', CURRENT_DATE);

  v_result := v_result || jsonb_build_object('week', COALESCE(v_week_stats, '{"messages":0,"checkins":0,"actions":0,"cost_cents":0}'::jsonb));

  -- This month's stats
  SELECT jsonb_build_object(
    'messages', COALESCE(SUM(total_messages), 0),
    'telegram_messages', COALESCE(SUM(telegram_messages), 0),
    'slack_messages', COALESCE(SUM(slack_messages), 0),
    'voice_messages', COALESCE(SUM(voice_messages), 0),
    'image_messages', COALESCE(SUM(image_messages), 0),
    'checkins_total', COALESCE(SUM(checkins_total), 0),
    'checkins_skipped', COALESCE(SUM(checkins_skipped), 0),
    'checkins_texted', COALESCE(SUM(checkins_texted), 0),
    'cost_cents', COALESCE(SUM(estimated_cost_cents), 0)
  )
  INTO v_month_stats
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND period_type = 'daily'
    AND period_start >= DATE_TRUNC('month', CURRENT_DATE);

  v_result := v_result || jsonb_build_object('month', COALESCE(v_month_stats, '{}'::jsonb));

  -- Memory stats
  SELECT jsonb_build_object(
    'total_memories', COUNT(*),
    'conversation_summaries', COUNT(*) FILTER (WHERE memory_type = 'conversation_summary'),
    'user_facts', COUNT(*) FILTER (WHERE memory_type = 'user_fact'),
    'user_goals', COUNT(*) FILTER (WHERE memory_type = 'user_goal'),
    'preferences', COUNT(*) FILTER (WHERE memory_type = 'preference'),
    'corrections', COUNT(*) FILTER (WHERE memory_type = 'user_correction')
  )
  INTO v_memory_stats
  FROM semantic_memories
  WHERE user_id = p_user_id;

  v_result := v_result || jsonb_build_object('memory', COALESCE(v_memory_stats, '{"total_memories":0}'::jsonb));

  -- Current autonomy status
  SELECT jsonb_build_object(
    'active_session', EXISTS (
      SELECT 1 FROM autonomy_sessions
      WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
    ),
    'total_sessions', (SELECT COUNT(*) FROM autonomy_sessions WHERE user_id = p_user_id),
    'total_actions', (SELECT COALESCE(SUM(actions_count), 0) FROM autonomy_sessions WHERE user_id = p_user_id)
  )
  INTO v_autonomy_stats;

  v_result := v_result || jsonb_build_object('autonomy', COALESCE(v_autonomy_stats, '{}'::jsonb));

  -- Recent activity (last 5 check-ins)
  SELECT jsonb_agg(jsonb_build_object(
    'time', created_at,
    'urgency', urgency_score,
    'action', action_decided,
    'reason', action_reason
  ) ORDER BY created_at DESC)
  INTO v_recent_activity
  FROM (
    SELECT created_at, urgency_score, action_decided, action_reason
    FROM checkin_executions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;

  v_result := v_result || jsonb_build_object('recent_checkins', COALESCE(v_recent_activity, '[]'::jsonb));

  -- Active goals count
  v_result := v_result || jsonb_build_object('active_goals', (
    SELECT COUNT(*) FROM user_goals WHERE user_id = p_user_id AND status = 'active'
  ));

  -- Pending confirmations
  v_result := v_result || jsonb_build_object('pending_confirmations', (
    SELECT COUNT(*) FROM pending_confirmations WHERE user_id = p_user_id AND status = 'pending'
  ));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update usage tracking (called by functions)
CREATE OR REPLACE FUNCTION increment_usage_stat(
  p_user_id UUID,
  p_stat_name TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Upsert daily stats
  INSERT INTO usage_tracking (
    user_id,
    period_start,
    period_end,
    period_type
  ) VALUES (
    p_user_id,
    CURRENT_DATE,
    CURRENT_DATE,
    'daily'
  )
  ON CONFLICT (user_id, period_start, period_type)
  DO NOTHING;

  -- Update the specific stat
  EXECUTE format(
    'UPDATE usage_tracking SET %I = %I + $1, updated_at = NOW()
     WHERE user_id = $2 AND period_start = CURRENT_DATE AND period_type = ''daily''',
    p_stat_name, p_stat_name
  ) USING p_increment, p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get channel breakdown for charts
CREATE OR REPLACE FUNCTION get_channel_breakdown(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  telegram INTEGER,
  slack INTEGER,
  total INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    period_start as date,
    telegram_messages as telegram,
    slack_messages as slack,
    total_messages as total
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND period_type = 'daily'
    AND period_start >= CURRENT_DATE - p_days
  ORDER BY period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get check-in effectiveness
CREATE OR REPLACE FUNCTION get_checkin_effectiveness(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_checkins', COUNT(*),
    'skipped', COUNT(*) FILTER (WHERE action_decided = 'skip'),
    'texted', COUNT(*) FILTER (WHERE action_decided = 'text'),
    'acknowledged', COUNT(*) FILTER (WHERE user_acknowledged = TRUE),
    'avg_urgency', ROUND(AVG(urgency_score)::NUMERIC, 1),
    'response_rate', CASE
      WHEN COUNT(*) FILTER (WHERE action_decided = 'text') > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE user_acknowledged = TRUE)::NUMERIC /
        COUNT(*) FILTER (WHERE action_decided = 'text')::NUMERIC * 100,
        1
      )
      ELSE 0
    END
  )
  INTO v_result
  FROM checkin_executions
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estimate monthly cost
CREATE OR REPLACE FUNCTION estimate_monthly_cost(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_claude_cost NUMERIC;
  v_openai_cost NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  -- Calculate based on current month usage
  SELECT
    -- Claude: $3/M input, $15/M output tokens (Haiku pricing)
    COALESCE(SUM(claude_input_tokens), 0) * 0.000003 +
    COALESCE(SUM(claude_output_tokens), 0) * 0.000015,
    -- OpenAI embeddings: $0.02/M tokens
    COALESCE(SUM(openai_tokens), 0) * 0.00002
  INTO v_claude_cost, v_openai_cost
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND period_type = 'daily'
    AND period_start >= DATE_TRUNC('month', CURRENT_DATE);

  v_total_cost := COALESCE(v_claude_cost, 0) + COALESCE(v_openai_cost, 0);

  RETURN jsonb_build_object(
    'claude_cost_usd', ROUND(v_claude_cost::NUMERIC, 2),
    'openai_cost_usd', ROUND(v_openai_cost::NUMERIC, 2),
    'total_cost_usd', ROUND(v_total_cost::NUMERIC, 2),
    'projected_monthly_usd', ROUND((v_total_cost / EXTRACT(DAY FROM CURRENT_DATE) * 30)::NUMERIC, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record API usage (called after API calls)
CREATE OR REPLACE FUNCTION record_api_usage(
  p_user_id UUID,
  p_provider TEXT, -- 'claude' or 'openai'
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  -- Ensure daily record exists
  INSERT INTO usage_tracking (user_id, period_start, period_end, period_type)
  VALUES (p_user_id, CURRENT_DATE, CURRENT_DATE, 'daily')
  ON CONFLICT (user_id, period_start, period_type) DO NOTHING;

  -- Update based on provider
  IF p_provider = 'claude' THEN
    UPDATE usage_tracking
    SET
      claude_api_calls = claude_api_calls + 1,
      claude_input_tokens = claude_input_tokens + p_input_tokens,
      claude_output_tokens = claude_output_tokens + p_output_tokens,
      updated_at = NOW()
    WHERE user_id = p_user_id AND period_start = CURRENT_DATE AND period_type = 'daily';
  ELSIF p_provider = 'openai' THEN
    UPDATE usage_tracking
    SET
      openai_api_calls = openai_api_calls + 1,
      openai_tokens = openai_tokens + p_input_tokens + p_output_tokens,
      updated_at = NOW()
    WHERE user_id = p_user_id AND period_start = CURRENT_DATE AND period_type = 'daily';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
