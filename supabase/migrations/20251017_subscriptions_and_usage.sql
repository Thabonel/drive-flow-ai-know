-- Subscriptions table to track user subscription status
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'pro', 'business')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'unpaid')),
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table for query limits and rate limiting
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_count INTEGER DEFAULT 0,
  last_query_at TIMESTAMP WITH TIME ZONE,
  queries_this_hour INTEGER DEFAULT 0,
  hour_window_start TIMESTAMP WITH TIME ZONE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Team members table for Business plan
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'removed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Usage alerts table for monitoring heavy usage
CREATE TABLE IF NOT EXISTS public.usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_usage', 'rate_limit', 'approaching_limit')),
  query_count INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON public.team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_user ON public.usage_alerts(user_id, alerted_at);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage"
  ON public.usage_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for team_members
CREATE POLICY "Team members can view their team"
  ON public.team_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    organization_id IN (
      SELECT organization_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage team members"
  ON public.team_members FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for usage_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.usage_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage alerts"
  ON public.usage_alerts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has exceeded query limit
CREATE OR REPLACE FUNCTION check_query_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_usage RECORD;
  v_limit INTEGER;
  v_allowed BOOLEAN := TRUE;
  v_reason TEXT := '';
BEGIN
  -- Get user's subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id
  AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription, deny (trial should be created on signup)
  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'No active subscription',
      'limit', 0,
      'used', 0
    );
  END IF;

  -- Get usage for current period
  SELECT * INTO v_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id
  AND period_start = DATE_TRUNC('month', NOW())
  LIMIT 1;

  -- Set query limit based on plan
  CASE v_subscription.plan_type
    WHEN 'starter' THEN v_limit := 200;
    WHEN 'pro' THEN v_limit := 1000;
    WHEN 'business' THEN v_limit := -1; -- unlimited
  END CASE;

  -- Check if exceeded (unlimited = -1, never exceeded)
  IF v_limit > 0 AND v_usage.query_count >= v_limit THEN
    v_allowed := FALSE;
    v_reason := 'Monthly query limit exceeded';
  END IF;

  -- Check rate limit (100 queries per hour)
  IF v_usage.queries_this_hour >= 100 AND
     v_usage.hour_window_start > (NOW() - INTERVAL '1 hour') THEN
    v_allowed := FALSE;
    v_reason := 'Rate limit exceeded (100 queries/hour)';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'limit', v_limit,
    'used', COALESCE(v_usage.query_count, 0),
    'queries_this_hour', COALESCE(v_usage.queries_this_hour, 0),
    'plan_type', v_subscription.plan_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment query count
CREATE OR REPLACE FUNCTION increment_query_count(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_hour TIMESTAMP WITH TIME ZONE := DATE_TRUNC('hour', NOW());
BEGIN
  INSERT INTO public.usage_tracking (
    user_id,
    query_count,
    last_query_at,
    queries_this_hour,
    hour_window_start,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    1,
    NOW(),
    1,
    v_current_hour,
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id, period_start) DO UPDATE SET
    query_count = public.usage_tracking.query_count + 1,
    last_query_at = NOW(),
    queries_this_hour = CASE
      WHEN public.usage_tracking.hour_window_start = v_current_hour
      THEN public.usage_tracking.queries_this_hour + 1
      ELSE 1
    END,
    hour_window_start = v_current_hour,
    updated_at = NOW();

  -- Create alert if high usage detected (>80% of limit)
  DECLARE
    v_subscription RECORD;
    v_usage RECORD;
    v_limit INTEGER;
  BEGIN
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = p_user_id AND status IN ('active', 'trialing')
    ORDER BY created_at DESC LIMIT 1;

    IF v_subscription.plan_type = 'starter' THEN
      v_limit := 200;
    ELSIF v_subscription.plan_type = 'pro' THEN
      v_limit := 1000;
    ELSE
      v_limit := -1; -- business unlimited
    END IF;

    IF v_limit > 0 THEN
      SELECT * INTO v_usage FROM public.usage_tracking
      WHERE user_id = p_user_id AND period_start = DATE_TRUNC('month', NOW());

      IF v_usage.query_count >= (v_limit * 0.8) THEN
        INSERT INTO public.usage_alerts (user_id, alert_type, query_count, threshold)
        VALUES (p_user_id, 'approaching_limit', v_usage.query_count, v_limit)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
