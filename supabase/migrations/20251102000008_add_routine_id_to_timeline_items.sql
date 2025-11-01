-- Add routine_id to timeline_items
-- Created: 2025-11-02
-- Purpose: Link timeline items to their source routine

-- Add routine_id column
ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES routine_items(id) ON DELETE SET NULL;

-- Add index for routine lookups
CREATE INDEX IF NOT EXISTS idx_timeline_items_routine_id
  ON timeline_items(user_id, routine_id)
  WHERE routine_id IS NOT NULL;

COMMENT ON COLUMN timeline_items.routine_id IS 'Links this timeline item to a recurring routine (NULL if not from a routine)';
