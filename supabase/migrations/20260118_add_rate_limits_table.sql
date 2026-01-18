-- Rate Limits table for API rate limiting
-- Used by edge functions to enforce per-user rate limits

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,          -- Usually user_id or IP address
  endpoint TEXT NOT NULL,             -- The endpoint being rate limited
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(identifier, endpoint, window_start);

-- Cleanup old records (run periodically via cron or pg_cron)
-- Records older than 1 hour can be safely deleted
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Optional: Enable RLS (rate limits should be accessible by service role only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate_limits
CREATE POLICY "Service role access only" ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE rate_limits IS 'Stores rate limiting data for API endpoints';
COMMENT ON COLUMN rate_limits.identifier IS 'User ID or IP address being rate limited';
COMMENT ON COLUMN rate_limits.endpoint IS 'API endpoint name (e.g., ai-query, register-user)';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in the current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Start time of the current rate limit window';
