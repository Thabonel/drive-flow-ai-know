-- Google Calendar Integration for Timeline Manager
-- Created: 2025-11-02
-- Purpose: Add two-way sync between Timeline and Google Calendar

-- ============================================================================
-- STEP 1: Add Google Calendar sync columns to timeline_items
-- ============================================================================

ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'local_only',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'local';

-- Add check constraints
ALTER TABLE timeline_items
  DROP CONSTRAINT IF EXISTS timeline_items_sync_status_check;
ALTER TABLE timeline_items
  ADD CONSTRAINT timeline_items_sync_status_check
  CHECK (sync_status IN ('synced', 'pending', 'conflict', 'local_only', 'error'));

ALTER TABLE timeline_items
  DROP CONSTRAINT IF EXISTS timeline_items_sync_source_check;
ALTER TABLE timeline_items
  ADD CONSTRAINT timeline_items_sync_source_check
  CHECK (sync_source IN ('local', 'google', 'both'));

-- Add unique constraint for Google event mapping (one-to-one relationship)
DROP INDEX IF EXISTS idx_timeline_items_google_event;
CREATE UNIQUE INDEX idx_timeline_items_google_event
  ON timeline_items(user_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

-- Add index for sync queries
CREATE INDEX IF NOT EXISTS idx_timeline_items_sync_status
  ON timeline_items(user_id, sync_status)
  WHERE sync_status != 'local_only';

-- ============================================================================
-- STEP 2: Create calendar_sync_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false NOT NULL,
  selected_calendar_id TEXT, -- Primary Google Calendar to sync with
  sync_direction TEXT DEFAULT 'both' NOT NULL CHECK (sync_direction IN ('to_calendar', 'from_calendar', 'both')),
  auto_sync_enabled BOOLEAN DEFAULT true NOT NULL,
  sync_interval_minutes INTEGER DEFAULT 15 NOT NULL CHECK (sync_interval_minutes >= 5),
  target_layer_id UUID REFERENCES timeline_layers(id) ON DELETE SET NULL, -- Which layer to put Google events in
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success', 'error', 'partial'
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment for documentation
COMMENT ON TABLE calendar_sync_settings IS 'User settings for Google Calendar synchronization with Timeline Manager';
COMMENT ON COLUMN calendar_sync_settings.sync_direction IS 'Direction of sync: to_calendar (Timeline→Google), from_calendar (Google→Timeline), both (bi-directional)';
COMMENT ON COLUMN calendar_sync_settings.target_layer_id IS 'Timeline layer where Google Calendar events will be created. NULL = default layer';

-- Enable RLS
ALTER TABLE calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar sync settings"
  ON calendar_sync_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar sync settings"
  ON calendar_sync_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar sync settings"
  ON calendar_sync_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar sync settings"
  ON calendar_sync_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Create calendar_sync_log table (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled', 'realtime')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  events_fetched INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  sync_duration_ms INTEGER, -- How long the sync took
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment
COMMENT ON TABLE calendar_sync_log IS 'Audit log of all Google Calendar sync operations for debugging and monitoring';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_user_created
  ON calendar_sync_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_status
  ON calendar_sync_log(status, created_at DESC)
  WHERE status = 'error';

-- Enable RLS
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync logs"
  ON calendar_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert sync logs"
  ON calendar_sync_log FOR INSERT
  WITH CHECK (true); -- Allow service role to insert for any user

-- ============================================================================
-- STEP 4: Create updated_at trigger for calendar_sync_settings
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calendar_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_calendar_sync_settings ON calendar_sync_settings;
CREATE TRIGGER set_updated_at_calendar_sync_settings
  BEFORE UPDATE ON calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_settings_updated_at();

-- ============================================================================
-- STEP 5: Create helper function to clean up orphaned calendar sync data
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_calendar_sync_data(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete timeline_items with Google event IDs that no longer sync
  WITH deleted AS (
    UPDATE timeline_items
    SET
      google_event_id = NULL,
      google_calendar_id = NULL,
      sync_status = 'local_only',
      sync_source = 'local'
    WHERE user_id = target_user_id
      AND google_event_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM calendar_sync_settings
        WHERE user_id = target_user_id
        AND enabled = true
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_calendar_sync_data IS 'Cleans up Google Calendar sync metadata from timeline_items when sync is disabled';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to check after migration)
-- ============================================================================

-- Check timeline_items columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'timeline_items'
-- AND column_name LIKE '%google%' OR column_name LIKE '%sync%';

-- Check calendar_sync_settings
-- SELECT * FROM calendar_sync_settings LIMIT 5;

-- Check calendar_sync_log
-- SELECT * FROM calendar_sync_log ORDER BY created_at DESC LIMIT 10;

-- Count items with Google sync
-- SELECT sync_status, COUNT(*) FROM timeline_items GROUP BY sync_status;
