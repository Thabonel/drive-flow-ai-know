-- Pitch deck generation jobs table for async processing
-- This enables progressive streaming of slide generation with real-time updates

CREATE TABLE IF NOT EXISTS pitch_deck_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'generating_structure',
    'generating_slides',
    'generating_images',
    'completed',
    'failed',
    'cancelled'
  )),
  progress_percent INTEGER DEFAULT 0,
  current_slide INTEGER DEFAULT 0,
  total_slides INTEGER,

  -- Input parameters (stored for retry capability)
  input_data JSONB NOT NULL,

  -- Output data (populated progressively as slides complete)
  slides JSONB DEFAULT '[]'::jsonb,
  deck_metadata JSONB,

  -- Error tracking and retry logic
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Index for efficient job polling and status queries
CREATE INDEX idx_pitch_deck_jobs_user_status
ON pitch_deck_jobs(user_id, status, created_at DESC);

-- Index for finding pending/in-progress jobs
CREATE INDEX idx_pitch_deck_jobs_pending
ON pitch_deck_jobs(status, created_at)
WHERE status IN ('pending', 'generating_structure', 'generating_slides', 'generating_images');

-- Enable Row Level Security
ALTER TABLE pitch_deck_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own pitch deck jobs" ON pitch_deck_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create jobs for themselves
CREATE POLICY "Users can create pitch deck jobs" ON pitch_deck_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update jobs (for background processing)
CREATE POLICY "Service role can update pitch deck jobs" ON pitch_deck_jobs
  FOR UPDATE USING (true);

-- Add trigger to update last_updated_at
CREATE OR REPLACE FUNCTION update_pitch_deck_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pitch_deck_job_timestamp_trigger
  BEFORE UPDATE ON pitch_deck_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_pitch_deck_job_timestamp();

-- Grant permissions
GRANT SELECT, INSERT ON pitch_deck_jobs TO authenticated;
GRANT UPDATE ON pitch_deck_jobs TO service_role;

COMMENT ON TABLE pitch_deck_jobs IS 'Stores pitch deck generation jobs for async processing with SSE streaming';
COMMENT ON COLUMN pitch_deck_jobs.slides IS 'Array of completed slides, populated progressively as each slide finishes';
COMMENT ON COLUMN pitch_deck_jobs.input_data IS 'Original request parameters stored for retry capability';
