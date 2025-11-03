-- Create webhook_events_queue table for async Stripe webhook processing
-- This solves the timeout issue by allowing immediate acknowledgment

CREATE TABLE IF NOT EXISTS webhook_events_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient processing queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_processed
  ON webhook_events_queue(processed, created_at)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_event_type
  ON webhook_events_queue(event_type);

-- RLS policies (service role will handle this, but good practice)
ALTER TABLE webhook_events_queue ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (webhooks run as service role)
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_webhook_events_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_webhook_events_queue_updated_at
  BEFORE UPDATE ON webhook_events_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_queue_updated_at();

-- Comment for documentation
COMMENT ON TABLE webhook_events_queue IS 'Queue for async processing of Stripe webhook events. Allows immediate 200 response to prevent Stripe timeouts.';
