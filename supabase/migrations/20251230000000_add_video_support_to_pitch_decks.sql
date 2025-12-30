-- Add video support to pitch_decks table
-- Allows storing video URLs for expressive animation mode

-- Add animation_style column to remember which mode was used
ALTER TABLE pitch_decks ADD COLUMN IF NOT EXISTS animation_style TEXT DEFAULT 'none';

-- Add comment explaining animation_style values
COMMENT ON COLUMN pitch_decks.animation_style IS 'Animation mode used: none, minimal, standard, expressive';

-- Note: deck_data JSONB already exists and will store video URLs in slide objects
-- No need to add separate video_urls column since deck_data structure is:
-- {
--   "title": "...",
--   "slides": [
--     {
--       "slideNumber": 1,
--       "title": "...",
--       "content": "...",
--       "imageData": "base64...",  -- for static modes
--       "videoUrl": "https://...", -- for expressive mode (NEW)
--       "videoDuration": 4.2,      -- seconds (NEW)
--       "videoFileSizeMb": 3.5     -- MB (NEW)
--     }
--   ]
-- }

-- Create video_cache table for caching generated videos by prompt hash
CREATE TABLE IF NOT EXISTS video_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  file_size_mb NUMERIC,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

-- Create index for fast prompt hash lookups
CREATE INDEX IF NOT EXISTS idx_video_cache_prompt_hash ON video_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_video_cache_last_used ON video_cache(last_used_at DESC);

-- Enable Row Level Security on video_cache
ALTER TABLE video_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read from cache (shared across users for cost savings)
CREATE POLICY "Anyone can read video cache"
  ON video_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update cache (Edge Function only)
CREATE POLICY "Service role can manage video cache"
  ON video_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON video_cache TO authenticated;
GRANT ALL ON video_cache TO service_role;

-- Function to update last_used_at and increment use_count
CREATE OR REPLACE FUNCTION update_video_cache_usage(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE video_cache
  SET
    last_used_at = NOW(),
    use_count = use_count + 1
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old cached videos (older than 30 days, not used recently)
CREATE OR REPLACE FUNCTION cleanup_old_video_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM video_cache
    WHERE last_used_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment explaining the cache strategy
COMMENT ON TABLE video_cache IS 'Caches generated videos by prompt hash to reduce API costs. Videos are shared across all users for maximum reuse.';
