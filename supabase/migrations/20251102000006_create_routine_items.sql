-- Create Routine Items System
-- Created: 2025-11-02
-- Purpose: Store recurring routine items that auto-populate daily

CREATE TABLE IF NOT EXISTS routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lunch', 'exercise', 'commute', 'break', 'personal', 'morning_routine', 'evening_routine')),
  default_time TEXT NOT NULL, -- HH:MM format
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  is_flexible BOOLEAN DEFAULT true NOT NULL,
  auto_add BOOLEAN DEFAULT true NOT NULL,
  color TEXT DEFAULT '#10b981',
  priority INTEGER DEFAULT 0, -- Higher priority items are less likely to be moved
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure valid days of week (0-6)
  CONSTRAINT valid_days_of_week CHECK (
    days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  )
);

-- Enable RLS
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own routine items"
  ON routine_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine items"
  ON routine_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routine items"
  ON routine_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routine items"
  ON routine_items FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routine_items_user_id
  ON routine_items(user_id);

CREATE INDEX IF NOT EXISTS idx_routine_items_auto_add
  ON routine_items(user_id, auto_add)
  WHERE auto_add = true;

CREATE INDEX IF NOT EXISTS idx_routine_items_type
  ON routine_items(user_id, type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_routine_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routine_items_updated_at_trigger
  BEFORE UPDATE ON routine_items
  FOR EACH ROW
  EXECUTE FUNCTION update_routine_items_updated_at();

-- Helper function to check if a day is in the routine's schedule
CREATE OR REPLACE FUNCTION is_routine_scheduled_for_day(
  routine_days INTEGER[],
  target_day INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN target_day = ANY(routine_days);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE routine_items IS 'Recurring routine items that auto-populate on timeline';
COMMENT ON COLUMN routine_items.type IS 'Category of routine: lunch, exercise, commute, break, personal, morning_routine, evening_routine';
COMMENT ON COLUMN routine_items.days_of_week IS 'Array of days (0=Sunday, 6=Saturday) when this routine applies';
COMMENT ON COLUMN routine_items.is_flexible IS 'Whether this routine can be automatically moved to accommodate meetings';
COMMENT ON COLUMN routine_items.auto_add IS 'Whether to automatically add this routine to the timeline';
COMMENT ON COLUMN routine_items.priority IS 'Higher priority routines are less likely to be moved (0=lowest)';
