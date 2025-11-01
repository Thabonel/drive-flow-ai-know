-- Create Time Tracking System
-- Created: 2025-11-02
-- Purpose: Track actual vs estimated time for AI learning and insights

CREATE TABLE IF NOT EXISTS time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,

  -- Task details
  task_title TEXT NOT NULL,
  task_type TEXT, -- work, meeting, personal, etc.
  task_tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Time tracking
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER NOT NULL CHECK (actual_duration_minutes > 0),
  overrun_minutes INTEGER GENERATED ALWAYS AS (
    actual_duration_minutes - COALESCE(estimated_duration_minutes, actual_duration_minutes)
  ) STORED,

  -- Temporal context
  completed_at TIMESTAMPTZ NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  is_morning BOOLEAN GENERATED ALWAYS AS (hour_of_day BETWEEN 6 AND 11) STORED,
  is_afternoon BOOLEAN GENERATED ALWAYS AS (hour_of_day BETWEEN 12 AND 17) STORED,
  is_evening BOOLEAN GENERATED ALWAYS AS (hour_of_day BETWEEN 18 AND 23) STORED,

  -- Accuracy tracking
  accuracy_percent NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN estimated_duration_minutes IS NULL OR estimated_duration_minutes = 0 THEN NULL
      ELSE ROUND(
        (1.0 - ABS(actual_duration_minutes - estimated_duration_minutes)::NUMERIC / estimated_duration_minutes::NUMERIC) * 100,
        2
      )
    END
  ) STORED,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure valid time values
  CONSTRAINT valid_times CHECK (
    estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0
  )
);

-- Enable RLS
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own time tracking data"
  ON time_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time tracking data"
  ON time_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time tracking data"
  ON time_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time tracking data"
  ON time_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id
  ON time_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_time_tracking_completed_at
  ON time_tracking(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_tracking_task_type
  ON time_tracking(user_id, task_type)
  WHERE task_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_tracking_temporal
  ON time_tracking(user_id, day_of_week, hour_of_day);

-- Create helper views for analytics
CREATE OR REPLACE VIEW time_tracking_stats AS
SELECT
  user_id,
  task_type,
  COUNT(*) as task_count,
  AVG(actual_duration_minutes) as avg_actual_minutes,
  AVG(estimated_duration_minutes) as avg_estimated_minutes,
  AVG(overrun_minutes) as avg_overrun_minutes,
  AVG(accuracy_percent) as avg_accuracy_percent,
  STDDEV(actual_duration_minutes) as stddev_actual_minutes
FROM time_tracking
WHERE estimated_duration_minutes IS NOT NULL
GROUP BY user_id, task_type;

-- Create function to automatically track task completion
CREATE OR REPLACE FUNCTION track_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  start_time TIMESTAMPTZ;
  duration_minutes INTEGER;
BEGIN
  -- Only track when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate actual duration from start_time to completed_at
    start_time := NEW.start_time;

    IF NEW.completed_at IS NOT NULL AND start_time IS NOT NULL THEN
      duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - start_time)) / 60;

      -- Only track if duration is reasonable (between 1 minute and 12 hours)
      IF duration_minutes >= 1 AND duration_minutes <= 720 THEN
        INSERT INTO time_tracking (
          user_id,
          task_id,
          task_title,
          task_type,
          estimated_duration_minutes,
          actual_duration_minutes,
          completed_at,
          day_of_week,
          hour_of_day
        ) VALUES (
          NEW.user_id,
          NEW.id,
          NEW.title,
          CASE
            WHEN NEW.is_meeting THEN 'meeting'
            ELSE 'work'
          END,
          NEW.planned_duration_minutes,
          duration_minutes,
          NEW.completed_at,
          EXTRACT(DOW FROM NEW.completed_at),
          EXTRACT(HOUR FROM NEW.completed_at)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tracking
CREATE TRIGGER auto_track_task_completion
  AFTER UPDATE ON timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION track_task_completion();

COMMENT ON TABLE time_tracking IS 'Tracks actual vs estimated time for AI learning and insights';
COMMENT ON COLUMN time_tracking.overrun_minutes IS 'Positive = took longer than estimated, Negative = finished early';
COMMENT ON COLUMN time_tracking.accuracy_percent IS 'How close the estimate was to actual (100% = perfect, 0% = very inaccurate)';
COMMENT ON VIEW time_tracking_stats IS 'Aggregated time tracking statistics by user and task type';
