-- Migration: Add 'lifetime_free' plan tier for admin-granted free-for-life accounts
-- Allows admins to grant certain users full Executive tier access, free forever

-- Step 1: Update the plan_tier check constraints to include lifetime_free

-- Update user_subscriptions constraint
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_plan_tier_check;

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_tier_check
  CHECK (plan_tier IN ('free', 'ai_starter', 'professional', 'executive', 'lifetime_free'));

-- Update plan_limits constraint
ALTER TABLE plan_limits
  DROP CONSTRAINT IF EXISTS plan_limits_plan_tier_check;

ALTER TABLE plan_limits
  ADD CONSTRAINT plan_limits_plan_tier_check
  CHECK (plan_tier IN ('free', 'ai_starter', 'professional', 'executive', 'lifetime_free'));

-- Step 2: Add lifetime_free tier limits to plan_limits table
-- This tier matches Executive tier features but is free forever
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
)
VALUES (
  'lifetime_free',
  999999,  -- Unlimited queries (Executive: 10000)
  999999,  -- Unlimited daily briefs (Executive: 1000)
  999999,  -- Unlimited email processing (Executive: 2000)
  1000,    -- 1TB storage (Executive: 500GB)
  NULL,    -- Unlimited timeline items (same as Executive)
  999,     -- High assistant invitations (Executive: 50)
  true,    -- Advanced AI features ✅
  true,    -- Priority support ✅
  true,    -- Custom integrations ✅
  true     -- Team features ✅
)
ON CONFLICT (plan_tier) DO NOTHING;

-- Add comment explaining the tier
COMMENT ON CONSTRAINT user_subscriptions_plan_tier_check ON user_subscriptions IS
  'Allowed plan tiers: free (standard), ai_starter, professional, executive, lifetime_free (admin-granted full access)';
