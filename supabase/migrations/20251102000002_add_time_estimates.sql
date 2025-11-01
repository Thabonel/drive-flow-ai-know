-- Add Time Estimates and Workload Management
-- Created: 2025-11-02
-- Purpose: Add duration tracking and flexibility flags to timeline items

-- Add new columns to timeline_items
ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_meeting BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN DEFAULT true NOT NULL;

-- Add check constraint for positive durations
ALTER TABLE timeline_items
  ADD CONSTRAINT planned_duration_positive CHECK (planned_duration_minutes IS NULL OR planned_duration_minutes > 0),
  ADD CONSTRAINT actual_duration_positive CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes > 0);

-- Update existing items to have planned_duration equal to duration_minutes
UPDATE timeline_items
SET planned_duration_minutes = duration_minutes
WHERE planned_duration_minutes IS NULL;

-- Add index for workload queries (date-based filtering)
CREATE INDEX IF NOT EXISTS idx_timeline_items_start_time_date
  ON timeline_items(DATE(start_time));

-- Add index for meeting queries
CREATE INDEX IF NOT EXISTS idx_timeline_items_is_meeting
  ON timeline_items(user_id, is_meeting);

COMMENT ON COLUMN timeline_items.planned_duration_minutes IS
  'Estimated duration for the task in minutes';

COMMENT ON COLUMN timeline_items.actual_duration_minutes IS
  'Actual time spent on the task after completion (for learning)';

COMMENT ON COLUMN timeline_items.is_meeting IS
  'Whether this item is a meeting (usually synced from calendar)';

COMMENT ON COLUMN timeline_items.is_flexible IS
  'Whether this task can be rescheduled or has flexible timing';
