-- ============================================================================
-- DUAL-AGENT JUDGE SYSTEM
-- Logs all action proposals and judge decisions for the safety layer.
-- Separate actor model (Claude Opus) from judge model (GPT-4.1 / Sonnet).
-- ============================================================================

-- Judge decisions audit trail
CREATE TABLE IF NOT EXISTS judge_decisions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id         TEXT        NOT NULL,
  tool_name         TEXT        NOT NULL,
  risk_class        TEXT        NOT NULL CHECK (risk_class IN ('readonly','reversible_write','external_impact','high_risk')),
  tool_input        JSONB       NOT NULL DEFAULT '{}',
  actor_reasoning   TEXT,
  user_query        TEXT,
  decision          TEXT        NOT NULL CHECK (decision IN ('allow','block','revise','escalate')),
  reason            TEXT        NOT NULL,
  revised_input     JSONB,
  confidence        NUMERIC(3,2),
  judge_model       TEXT,
  processing_ms     INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE judge_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own judge decisions"
  ON judge_decisions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts judge decisions"
  ON judge_decisions FOR INSERT WITH CHECK (true);

-- Per-user action policy overrides (optional, defaults applied by code)
CREATE TABLE IF NOT EXISTS action_policies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name   TEXT,                          -- NULL = applies to whole risk_class
  risk_class  TEXT        NOT NULL,
  policy      TEXT        NOT NULL DEFAULT 'require_judge'
                          CHECK (policy IN ('auto_allow','auto_block','require_judge','require_human')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE action_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own action policies"
  ON action_policies FOR ALL USING (auth.uid() = user_id);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_judge_decisions_user_time
  ON judge_decisions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_judge_decisions_decision
  ON judge_decisions(decision);

CREATE INDEX IF NOT EXISTS idx_action_policies_user
  ON action_policies(user_id, risk_class, tool_name);

-- View: judge metrics per user (approval/denial/escalation rates by risk class)
CREATE OR REPLACE VIEW judge_metrics AS
SELECT
  user_id,
  risk_class,
  COUNT(*)                                                         AS total_decisions,
  COUNT(*) FILTER (WHERE decision = 'allow')                       AS allowed,
  COUNT(*) FILTER (WHERE decision = 'block')                       AS blocked,
  COUNT(*) FILTER (WHERE decision = 'revise')                      AS revised,
  COUNT(*) FILTER (WHERE decision = 'escalate')                    AS escalated,
  ROUND(COUNT(*) FILTER (WHERE decision = 'allow') * 100.0 / COUNT(*), 1) AS allow_rate_pct,
  ROUND(AVG(processing_ms))                                        AS avg_processing_ms,
  MAX(created_at)                                                  AS last_judged_at
FROM judge_decisions
GROUP BY user_id, risk_class;
