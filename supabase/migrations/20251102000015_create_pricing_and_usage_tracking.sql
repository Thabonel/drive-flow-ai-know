-- ========================================================================
-- PRICING TIERS & USAGE TRACKING
-- ========================================================================

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (
    plan_tier IN ('free', 'ai_starter', 'professional', 'executive')
  ),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')
  ),

  -- Trial
  trial_ends_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Usage period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- AI Feature usage
  ai_queries_count INTEGER DEFAULT 0,
  ai_daily_briefs_count INTEGER DEFAULT 0,
  ai_email_processing_count INTEGER DEFAULT 0,
  ai_meeting_prep_count INTEGER DEFAULT 0,
  ai_task_breakdown_count INTEGER DEFAULT 0,
  ai_time_insights_count INTEGER DEFAULT 0,

  -- Document usage
  documents_uploaded_count INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,

  -- Timeline usage
  timeline_items_created INTEGER DEFAULT 0,
  timeline_items_total INTEGER DEFAULT 0,

  -- Assistant usage
  assistant_invitations_sent INTEGER DEFAULT 0,
  active_assistants_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_period UNIQUE (user_id, period_start, period_end)
);

-- Usage limits by plan
CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_tier TEXT NOT NULL UNIQUE CHECK (
    plan_tier IN ('free', 'ai_starter', 'professional', 'executive')
  ),

  -- AI limits
  ai_queries_per_month INTEGER NOT NULL,
  ai_daily_briefs_per_month INTEGER NOT NULL,
  ai_email_processing_per_month INTEGER NOT NULL,

  -- Storage limits
  storage_limit_gb INTEGER NOT NULL,

  -- Timeline limits
  timeline_items_limit INTEGER,

  -- Assistant limits
  assistant_invitations_limit INTEGER,

  -- Features
  advanced_ai_features BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  custom_integrations BOOLEAN DEFAULT FALSE,
  team_features BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plan limits
INSERT INTO plan_limits (
  plan_tier,
  ai_queries_per_month,
  ai_daily_briefs_per_month,
  ai_email_processing_per_month,
  storage_limit_gb,
  timeline_items_limit,
  assistant_invitations_limit,
  advanced_ai_features,
  priority_support,
  custom_integrations,
  team_features
) VALUES
  ('free', 50, 0, 0, 1, 50, 0, FALSE, FALSE, FALSE, FALSE),
  ('ai_starter', 500, 30, 100, 10, 500, 2, TRUE, FALSE, FALSE, FALSE),
  ('professional', 2000, 100, 500, 50, 2000, 10, TRUE, TRUE, TRUE, FALSE),
  ('executive', 10000, 1000, 2000, 500, NULL, 50, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (plan_tier) DO NOTHING;

-- Upgrade prompts tracking
CREATE TABLE upgrade_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prompt details
  prompt_type TEXT NOT NULL CHECK (
    prompt_type IN ('limit_warning', 'limit_reached', 'feature_locked', 'trial_ending', 'usage_milestone')
  ),
  feature_name TEXT,
  current_usage INTEGER,
  usage_limit INTEGER,

  -- User action
  action_taken TEXT CHECK (
    action_taken IN ('dismissed', 'upgraded', 'viewed_pricing', 'ignored')
  ),
  upgraded_to_plan TEXT,

  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_taken_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_trial ON user_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

CREATE INDEX idx_user_usage_user ON user_usage(user_id);
CREATE INDEX idx_user_usage_period ON user_usage(period_start, period_end);

CREATE INDEX idx_upgrade_prompts_user ON upgrade_prompts(user_id);
CREATE INDEX idx_upgrade_prompts_type ON upgrade_prompts(prompt_type);
CREATE INDEX idx_upgrade_prompts_upgraded ON upgrade_prompts(upgraded_to_plan) WHERE upgraded_to_plan IS NOT NULL;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_prompts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

-- User usage
CREATE POLICY "Users can view their own usage"
  ON user_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert usage"
  ON user_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update usage"
  ON user_usage FOR UPDATE
  USING (true);

-- Plan limits
CREATE POLICY "Everyone can view plan limits"
  ON plan_limits FOR SELECT
  TO public
  USING (true);

-- Upgrade prompts
CREATE POLICY "Users can view their own prompts"
  ON upgrade_prompts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert prompts"
  ON upgrade_prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their prompts"
  ON upgrade_prompts FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get current usage for user
CREATE FUNCTION get_current_usage(p_user_id UUID)
RETURNS TABLE (
  ai_queries_used INTEGER,
  ai_queries_limit INTEGER,
  ai_queries_percentage NUMERIC,
  ai_daily_briefs_used INTEGER,
  ai_daily_briefs_limit INTEGER,
  storage_used_gb NUMERIC,
  storage_limit_gb INTEGER,
  plan_tier TEXT
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get current billing period
  v_period_start := DATE_TRUNC('month', NOW())::DATE;
  v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  SELECT
    COALESCE(uu.ai_queries_count, 0)::INTEGER AS ai_queries_used,
    pl.ai_queries_per_month AS ai_queries_limit,
    ROUND((COALESCE(uu.ai_queries_count, 0)::NUMERIC / NULLIF(pl.ai_queries_per_month, 0)) * 100, 1) AS ai_queries_percentage,
    COALESCE(uu.ai_daily_briefs_count, 0)::INTEGER AS ai_daily_briefs_used,
    pl.ai_daily_briefs_per_month AS ai_daily_briefs_limit,
    ROUND(COALESCE(uu.storage_used_bytes, 0)::NUMERIC / 1073741824, 2) AS storage_used_gb,
    pl.storage_limit_gb,
    us.plan_tier
  FROM user_subscriptions us
  JOIN plan_limits pl ON pl.plan_tier = us.plan_tier
  LEFT JOIN user_usage uu ON uu.user_id = us.user_id
    AND uu.period_start = v_period_start
    AND uu.period_end = v_period_end
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can use feature
CREATE FUNCTION can_use_feature(
  p_user_id UUID,
  p_feature_type TEXT, -- 'ai_query', 'daily_brief', 'email_processing', etc.
  p_increment BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_column_name TEXT;
BEGIN
  -- Get current billing period
  v_period_start := DATE_TRUNC('month', NOW())::DATE;
  v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Map feature type to column name
  v_column_name := CASE p_feature_type
    WHEN 'ai_query' THEN 'ai_queries_count'
    WHEN 'daily_brief' THEN 'ai_daily_briefs_count'
    WHEN 'email_processing' THEN 'ai_email_processing_count'
    WHEN 'meeting_prep' THEN 'ai_meeting_prep_count'
    WHEN 'task_breakdown' THEN 'ai_task_breakdown_count'
    WHEN 'time_insights' THEN 'ai_time_insights_count'
    ELSE NULL
  END;

  IF v_column_name IS NULL THEN
    RETURN TRUE; -- Unknown feature type, allow
  END IF;

  -- Get current usage and limit
  EXECUTE format('
    SELECT COALESCE(uu.%I, 0), pl.%I
    FROM user_subscriptions us
    JOIN plan_limits pl ON pl.plan_tier = us.plan_tier
    LEFT JOIN user_usage uu ON uu.user_id = us.user_id
      AND uu.period_start = $1
      AND uu.period_end = $2
    WHERE us.user_id = $3
  ', v_column_name, REPLACE(v_column_name, '_count', '_per_month'))
  INTO v_current_usage, v_limit
  USING v_period_start, v_period_end, p_user_id;

  -- Check if under limit
  IF v_current_usage < v_limit THEN
    -- Increment if requested
    IF p_increment THEN
      EXECUTE format('
        INSERT INTO user_usage (user_id, period_start, period_end, %I)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, period_start, period_end)
        DO UPDATE SET %I = user_usage.%I + 1
      ', v_column_name, v_column_name, v_column_name)
      USING p_user_id, v_period_start, v_period_end;
    END IF;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger
CREATE FUNCTION update_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_updated_at();

CREATE TRIGGER user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_updated_at();

CREATE TRIGGER plan_limits_updated_at
  BEFORE UPDATE ON plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Pricing and usage tracking migration completed!' AS status;

SELECT 'Created ' || COUNT(*) || ' tables (expected: 4)' AS result
FROM information_schema.tables
WHERE table_name IN ('user_subscriptions', 'user_usage', 'plan_limits', 'upgrade_prompts');

SELECT 'Created ' || COUNT(*) || ' plan tiers' AS result
FROM plan_limits;
