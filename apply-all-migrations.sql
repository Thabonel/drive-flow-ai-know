-- Create Day Templates System
-- Created: 2025-11-02
-- Purpose: Store reusable day schedule templates

CREATE TABLE IF NOT EXISTS day_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  template_blocks JSONB NOT NULL DEFAULT '[]'::JSONB,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- System templates don't have user_id, user templates must have user_id
  CONSTRAINT user_or_system_check CHECK (
    (is_system = true AND user_id IS NULL) OR
    (is_system = false AND user_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE day_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view system templates and their own templates
CREATE POLICY "Users can view system and own templates"
  ON day_templates FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

-- Users can only insert their own templates (not system)
CREATE POLICY "Users can insert own templates"
  ON day_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON day_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON day_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_day_templates_user_id
  ON day_templates(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_day_templates_is_system
  ON day_templates(is_system)
  WHERE is_system = true;

CREATE INDEX IF NOT EXISTS idx_day_templates_usage
  ON day_templates(usage_count DESC, last_used_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_day_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_day_templates_updated_at_trigger
  BEFORE UPDATE ON day_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_day_templates_updated_at();

COMMENT ON TABLE day_templates IS 'Reusable day schedule templates (system and user-created)';
COMMENT ON COLUMN day_templates.template_blocks IS 'Array of time blocks: [{start_time, duration_minutes, title, type, color, is_flexible}]';
COMMENT ON COLUMN day_templates.is_system IS 'System templates are shared with all users (read-only)';
COMMENT ON COLUMN day_templates.is_default IS 'User can mark one template as their default';
COMMENT ON COLUMN day_templates.usage_count IS 'Track how often this template is used';
-- Seed System Templates
-- Created: 2025-11-02
-- Purpose: Create high-quality system templates for users

-- Template 1: Executive Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Executive Day',
  'Balanced schedule with strategic focus blocks and meetings. Perfect for leaders balancing deep work with team interactions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Review", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 90, "title": "Strategic Focus Block", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "10:00", "duration_minutes": 30, "title": "Team Standup", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "10:30", "duration_minutes": 90, "title": "Executive Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch Break", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:00", "duration_minutes": 60, "title": "1-on-1 Meetings", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:00", "duration_minutes": 30, "title": "Email & Communications", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:30", "duration_minutes": 90, "title": "Project Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 30, "title": "End-of-Day Review", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 2: Deep Work Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Deep Work Day',
  'Maximize focus with long, uninterrupted work blocks. Minimal meetings, maximum productivity for complex tasks.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Setup", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 240, "title": "Deep Work Block 1", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "12:30", "duration_minutes": 60, "title": "Lunch & Walk", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:30", "duration_minutes": 240, "title": "Deep Work Block 2", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "17:30", "duration_minutes": 30, "title": "Wrap Up & Planning", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 3: Meeting Heavy
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Meeting Heavy',
  'Structured schedule for days packed with meetings. Includes buffer time and quick breaks between sessions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Prep & Emails", "type": "work", "color": "#06b6d4", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 30, "title": "Meeting 1", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "09:00", "duration_minutes": 30, "title": "Meeting 2", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "09:30", "duration_minutes": 15, "title": "Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "09:45", "duration_minutes": 60, "title": "Meeting 3", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "10:45", "duration_minutes": 30, "title": "Meeting 4", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "11:15", "duration_minutes": 45, "title": "Catch-up Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 30, "title": "Meeting 5", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "13:30", "duration_minutes": 30, "title": "Meeting 6", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:00", "duration_minutes": 15, "title": "Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "14:15", "duration_minutes": 60, "title": "Meeting 7", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "15:15", "duration_minutes": 30, "title": "Meeting 8", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "15:45", "duration_minutes": 45, "title": "Follow-ups & Notes", "type": "work", "color": "#06b6d4", "is_flexible": false},
    {"start_time": "16:30", "duration_minutes": 30, "title": "End-of-Day Wrap", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 4: Travel Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Travel Day',
  'Lighter schedule with flexibility for travel time. Essential meetings only, with buffer time built in.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 60, "title": "Travel Prep", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "09:00", "duration_minutes": 180, "title": "Travel Time", "type": "personal", "color": "#ef4444", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:00", "duration_minutes": 60, "title": "Light Work / Emails", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:00", "duration_minutes": 30, "title": "Essential Meeting", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:30", "duration_minutes": 90, "title": "Flexible Work Block", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 60, "title": "Wrap Up & Rest", "type": "personal", "color": "#10b981", "is_flexible": true}
  ]'::jsonb
);

-- Template 5: Recovery Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Recovery Day',
  'Minimal commitments with focus on rest and self-care. Light work, plenty of breaks, and personal time.',
  true,
  '[
    {"start_time": "09:00", "duration_minutes": 60, "title": "Morning Routine", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "10:00", "duration_minutes": 90, "title": "Light Work Block", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "11:30", "duration_minutes": 30, "title": "Break / Walk", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 90, "title": "Lunch & Relaxation", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:30", "duration_minutes": 60, "title": "Easy Tasks", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:30", "duration_minutes": 30, "title": "Personal Time", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "15:00", "duration_minutes": 60, "title": "Optional: Light Work", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 120, "title": "Free Time / Self Care", "type": "personal", "color": "#10b981", "is_flexible": true}
  ]'::jsonb
);

-- Template 6: Maker Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Maker Day',
  'Optimized for creators, developers, and designers. Large blocks for creative flow with minimal interruptions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Creative Warmup", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 180, "title": "Creation Block 1", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "11:30", "duration_minutes": 30, "title": "Quick Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 180, "title": "Creation Block 2", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "16:00", "duration_minutes": 30, "title": "Review & Refine", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:30", "duration_minutes": 30, "title": "Planning Tomorrow", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 7: Balanced Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Balanced Day',
  'Well-rounded schedule mixing work, meetings, breaks, and personal time. Great default template for most days.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Routine", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 120, "title": "Focused Work", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "10:30", "duration_minutes": 30, "title": "Meeting", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "11:00", "duration_minutes": 60, "title": "Project Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 30, "title": "Emails & Admin", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "13:30", "duration_minutes": 90, "title": "Collaborative Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "15:00", "duration_minutes": 15, "title": "Coffee Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "15:15", "duration_minutes": 60, "title": "Wrap Up Tasks", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:15", "duration_minutes": 30, "title": "End-of-Day Review", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

COMMENT ON TABLE day_templates IS 'System templates created. Users can now browse and apply these templates to their timeline.';
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
-- Seed Default Routine Items
-- Created: 2025-11-02
-- Purpose: Create helpful default routines for new users

-- Note: This is a template. Each user will get these created when they first use the system.
-- We'll implement this via a function that users can call to create their default routines.

CREATE OR REPLACE FUNCTION create_default_routines_for_user(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  routines_created INTEGER := 0;
BEGIN
  -- Check if user already has routines
  IF EXISTS (SELECT 1 FROM routine_items WHERE user_id = target_user_id) THEN
    RETURN 0; -- User already has routines
  END IF;

  -- Routine 1: Lunch (daily, 12:00-13:00)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Lunch Break',
    'lunch',
    '12:00',
    60,
    ARRAY[0,1,2,3,4,5,6], -- All days
    true,
    true,
    '#f59e0b', -- Amber
    8 -- High priority - people need to eat!
  );
  routines_created := routines_created + 1;

  -- Routine 2: Morning Routine (daily, 7:00-8:00)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Morning Routine',
    'morning_routine',
    '07:00',
    60,
    ARRAY[0,1,2,3,4,5,6], -- All days
    true,
    true,
    '#10b981', -- Green
    5
  );
  routines_created := routines_created + 1;

  -- Routine 3: Morning Commute (weekdays, 8:30-9:00)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Commute to Work',
    'commute',
    '08:30',
    30,
    ARRAY[1,2,3,4,5], -- Monday-Friday
    false, -- Fixed time
    true,
    '#6b7280', -- Gray
    7
  );
  routines_created := routines_created + 1;

  -- Routine 4: Evening Commute (weekdays, 17:30-18:00)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Commute Home',
    'commute',
    '17:30',
    30,
    ARRAY[1,2,3,4,5], -- Monday-Friday
    false, -- Fixed time
    true,
    '#6b7280', -- Gray
    7
  );
  routines_created := routines_created + 1;

  -- Routine 5: Exercise (Mon/Wed/Fri, 7:00-8:00)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Morning Exercise',
    'exercise',
    '07:00',
    60,
    ARRAY[1,3,5], -- Mon/Wed/Fri
    true,
    false, -- Off by default - user can enable
    '#ef4444', -- Red
    6
  );
  routines_created := routines_created + 1;

  -- Routine 6: Afternoon Break (weekdays, 15:00-15:15)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Afternoon Break',
    'break',
    '15:00',
    15,
    ARRAY[1,2,3,4,5], -- Monday-Friday
    true,
    true,
    '#f59e0b', -- Amber
    4
  );
  routines_created := routines_created + 1;

  -- Routine 7: Evening Routine (daily, 21:00-21:30)
  INSERT INTO routine_items (
    user_id, title, type, default_time, duration_minutes,
    days_of_week, is_flexible, auto_add, color, priority
  ) VALUES (
    target_user_id,
    'Evening Wind Down',
    'evening_routine',
    '21:00',
    30,
    ARRAY[0,1,2,3,4,5,6], -- All days
    true,
    false, -- Off by default
    '#10b981', -- Green
    3
  );
  routines_created := routines_created + 1;

  RETURN routines_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_routines_for_user IS 'Creates a set of helpful default routines for a user. Call once per user when they first access the routine features.';
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
-- Create Daily Planning System
-- Created: 2025-11-02
-- Purpose: Sunsama-style daily planning ritual with streaks and celebrations

-- Daily planning settings (user preferences)
CREATE TABLE IF NOT EXISTS daily_planning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Planning time preferences
  planning_time TIME DEFAULT '09:00:00' NOT NULL,
  duration_minutes INTEGER DEFAULT 15 NOT NULL CHECK (duration_minutes > 0),
  skip_weekends BOOLEAN DEFAULT false NOT NULL,

  -- Planning steps to include
  review_yesterday BOOLEAN DEFAULT true NOT NULL,
  import_calendar BOOLEAN DEFAULT true NOT NULL,
  set_priorities BOOLEAN DEFAULT true NOT NULL,
  check_workload BOOLEAN DEFAULT true NOT NULL,

  -- Notification preferences
  enable_notifications BOOLEAN DEFAULT true NOT NULL,
  snooze_duration_minutes INTEGER DEFAULT 15 NOT NULL,

  -- Quick planning option
  quick_planning_enabled BOOLEAN DEFAULT true NOT NULL,

  -- End-of-day shutdown
  shutdown_time TIME DEFAULT '17:00:00',
  enable_shutdown_ritual BOOLEAN DEFAULT true NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Daily planning sessions (tracking when user completes planning)
CREATE TABLE IF NOT EXISTS daily_planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  planning_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  is_quick_planning BOOLEAN DEFAULT false NOT NULL,

  -- What was done in this session
  reviewed_yesterday BOOLEAN DEFAULT false,
  imported_calendar BOOLEAN DEFAULT false,
  set_priorities BOOLEAN DEFAULT false,
  checked_workload BOOLEAN DEFAULT false,
  committed_schedule BOOLEAN DEFAULT false,

  -- Yesterday's stats
  yesterday_completed_count INTEGER DEFAULT 0,
  yesterday_total_count INTEGER DEFAULT 0,

  -- Today's plan
  priority_task_ids UUID[] DEFAULT ARRAY[]::UUID[],
  total_planned_minutes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one session per user per day
  CONSTRAINT unique_session_per_day UNIQUE (user_id, planning_date)
);

-- End-of-day shutdown sessions
CREATE TABLE IF NOT EXISTS daily_shutdown_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  shutdown_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,

  -- Stats from today
  tasks_completed INTEGER DEFAULT 0 NOT NULL,
  tasks_total INTEGER DEFAULT 0 NOT NULL,
  minutes_worked INTEGER DEFAULT 0,

  -- What's moving to tomorrow
  moved_to_tomorrow UUID[] DEFAULT ARRAY[]::UUID[],

  -- User reflections
  wins TEXT[] DEFAULT ARRAY[]::TEXT[],
  challenges TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one shutdown per user per day
  CONSTRAINT unique_shutdown_per_day UNIQUE (user_id, shutdown_date)
);

-- Planning streaks (calculated view)
CREATE OR REPLACE VIEW planning_streaks AS
WITH daily_sessions AS (
  SELECT
    user_id,
    planning_date,
    completed_at IS NOT NULL as completed,
    LAG(planning_date) OVER (PARTITION BY user_id ORDER BY planning_date) as prev_date
  FROM daily_planning_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY user_id, planning_date
),
streak_groups AS (
  SELECT
    user_id,
    planning_date,
    completed,
    SUM(CASE
      WHEN prev_date IS NULL OR planning_date - prev_date > 1 THEN 1
      ELSE 0
    END) OVER (PARTITION BY user_id ORDER BY planning_date) as streak_group
  FROM daily_sessions
),
streak_calculations AS (
  SELECT
    user_id,
    streak_group,
    MIN(planning_date) as streak_start,
    MAX(planning_date) as streak_end,
    COUNT(*) as streak_length
  FROM streak_groups
  WHERE completed = true
  GROUP BY user_id, streak_group
)
SELECT
  user_id,
  MAX(streak_length) as longest_streak,
  (
    SELECT streak_length
    FROM streak_calculations sc2
    WHERE sc2.user_id = sc.user_id
      AND sc2.streak_end = (SELECT MAX(planning_date) FROM daily_planning_sessions WHERE user_id = sc.user_id AND completed_at IS NOT NULL)
    LIMIT 1
  ) as current_streak,
  COUNT(DISTINCT streak_group) as total_streaks
FROM streak_calculations sc
GROUP BY user_id;

-- Enable RLS
ALTER TABLE daily_planning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_shutdown_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_planning_settings
CREATE POLICY "Users can view their own planning settings"
  ON daily_planning_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planning settings"
  ON daily_planning_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning settings"
  ON daily_planning_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_planning_sessions
CREATE POLICY "Users can view their own planning sessions"
  ON daily_planning_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planning sessions"
  ON daily_planning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning sessions"
  ON daily_planning_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planning sessions"
  ON daily_planning_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_shutdown_sessions
CREATE POLICY "Users can view their own shutdown sessions"
  ON daily_shutdown_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shutdown sessions"
  ON daily_shutdown_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shutdown sessions"
  ON daily_shutdown_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planning_settings_user_id
  ON daily_planning_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_user_date
  ON daily_planning_sessions(user_id, planning_date DESC);

CREATE INDEX IF NOT EXISTS idx_shutdown_sessions_user_date
  ON daily_shutdown_sessions(user_id, shutdown_date DESC);

-- Function to create default planning settings for new users
CREATE OR REPLACE FUNCTION create_default_planning_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_planning_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default settings when user signs up
CREATE TRIGGER create_planning_settings_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_planning_settings();

-- Function to check if planning is needed today
CREATE OR REPLACE FUNCTION planning_needed_today(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  dow INTEGER := EXTRACT(DOW FROM today_date);
  settings RECORD;
  session_exists BOOLEAN;
BEGIN
  -- Get user settings
  SELECT * INTO settings
  FROM daily_planning_settings
  WHERE user_id = p_user_id;

  -- If no settings, planning is needed
  IF settings IS NULL THEN
    RETURN true;
  END IF;

  -- Check if should skip weekends (0 = Sunday, 6 = Saturday)
  IF settings.skip_weekends AND (dow = 0 OR dow = 6) THEN
    RETURN false;
  END IF;

  -- Check if session already exists for today
  SELECT EXISTS(
    SELECT 1 FROM daily_planning_sessions
    WHERE user_id = p_user_id
      AND planning_date = today_date
      AND completed_at IS NOT NULL
  ) INTO session_exists;

  RETURN NOT session_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current streak
CREATE OR REPLACE FUNCTION get_current_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE - 1; -- Start from yesterday
  session_exists BOOLEAN;
BEGIN
  -- Count consecutive days backwards
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM daily_planning_sessions
      WHERE user_id = p_user_id
        AND planning_date = check_date
        AND completed_at IS NOT NULL
    ) INTO session_exists;

    EXIT WHEN NOT session_exists;

    streak_count := streak_count + 1;
    check_date := check_date - 1;

    -- Safety limit
    EXIT WHEN streak_count > 365;
  END LOOP;

  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE daily_planning_settings IS 'User preferences for daily planning ritual';
COMMENT ON TABLE daily_planning_sessions IS 'Tracks when users complete their daily planning';
COMMENT ON TABLE daily_shutdown_sessions IS 'Tracks end-of-day shutdown rituals';
COMMENT ON VIEW planning_streaks IS 'Calculates planning streaks for gamification';
-- Create Booking Links System
-- Created: 2025-11-02
-- Purpose: Calendly-style booking links with availability checking

-- Enable btree_gist extension for UUID equality in GiST indexes
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Booking links (user's shareable scheduling links)
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Link details
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),

  -- Availability settings
  availability_hours JSONB NOT NULL DEFAULT '{
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }'::JSONB,

  -- Buffer times (in minutes)
  buffer_before_minutes INTEGER DEFAULT 0 NOT NULL,
  buffer_after_minutes INTEGER DEFAULT 0 NOT NULL,

  -- Scheduling constraints
  min_notice_hours INTEGER DEFAULT 24 NOT NULL,
  max_days_advance INTEGER DEFAULT 60 NOT NULL,

  -- Custom questions for bookers
  custom_questions JSONB DEFAULT '[]'::JSONB,
  -- Example: [{"question": "What's your company?", "required": true, "type": "text"}]

  -- Location/meeting details
  location_type TEXT DEFAULT 'zoom' CHECK (location_type IN ('zoom', 'google_meet', 'phone', 'in_person', 'custom')),
  location_details TEXT,

  -- Settings
  is_active BOOLEAN DEFAULT true NOT NULL,
  require_confirmation BOOLEAN DEFAULT false NOT NULL,
  send_reminders BOOLEAN DEFAULT true NOT NULL,

  -- Color for calendar display
  color TEXT DEFAULT '#3b82f6',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure slug is URL-safe
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Bookings (scheduled meetings through booking links)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Booking details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,

  -- Booker information
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  booker_phone TEXT,
  booker_timezone TEXT NOT NULL,

  -- Custom question responses
  custom_responses JSONB DEFAULT '{}'::JSONB,
  -- Example: {"company": "Acme Inc", "project_details": "Need help with..."}

  -- Status
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Calendar integration
  timeline_item_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,
  google_calendar_event_id TEXT,

  -- Reminders sent
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent double booking
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('confirmed', 'pending'))
);

-- Booking link analytics
CREATE TABLE IF NOT EXISTS booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'booking_started', 'booking_completed', 'booking_cancelled')),

  -- Visitor info
  visitor_ip TEXT,
  visitor_country TEXT,
  visitor_timezone TEXT,

  -- Referrer
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_links
CREATE POLICY "Users can view their own booking links"
  ON booking_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking links"
  ON booking_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking links"
  ON booking_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking links"
  ON booking_links FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access to active booking links by slug
CREATE POLICY "Anyone can view active booking links by slug"
  ON booking_links FOR SELECT
  USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for analytics
CREATE POLICY "Users can view analytics for their booking links"
  ON booking_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_analytics.booking_link_id
        AND booking_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert analytics"
  ON booking_analytics FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_user_id
  ON booking_links(user_id);

CREATE INDEX IF NOT EXISTS idx_booking_links_slug
  ON booking_links(slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_link_id
  ON bookings(booking_link_id);

CREATE INDEX IF NOT EXISTS idx_bookings_start_time
  ON bookings(user_id, start_time) WHERE status IN ('confirmed', 'pending');

CREATE INDEX IF NOT EXISTS idx_booking_analytics_link_id
  ON booking_analytics(booking_link_id, created_at DESC);

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION is_time_slot_available(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicting bookings
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE user_id = p_user_id
    AND status IN ('confirmed', 'pending')
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  -- Check for conflicting timeline items (meetings)
  SELECT COUNT(*) + conflict_count INTO conflict_count
  FROM timeline_items
  WHERE user_id = p_user_id
    AND is_meeting = true
    AND status != 'completed'
    AND tstzrange(
      start_time,
      start_time + (duration_minutes || ' minutes')::INTERVAL
    ) && tstzrange(p_start_time, p_end_time);

  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate available time slots
CREATE OR REPLACE FUNCTION get_available_slots(
  p_booking_link_id UUID,
  p_date DATE,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
DECLARE
  link RECORD;
  day_name TEXT;
  availability_windows JSONB;
  window JSONB;
  slot_start TIMESTAMPTZ;
  slot_end TIMESTAMPTZ;
  current_time TIMESTAMPTZ;
BEGIN
  -- Get booking link details
  SELECT * INTO link
  FROM booking_links
  WHERE id = p_booking_link_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get day of week name
  day_name := LOWER(TO_CHAR(p_date, 'Day'));
  day_name := TRIM(day_name);

  -- Get availability windows for this day
  availability_windows := link.availability_hours->day_name;

  IF availability_windows IS NULL OR jsonb_array_length(availability_windows) = 0 THEN
    RETURN;
  END IF;

  current_time := NOW();

  -- Generate slots for each availability window
  FOR window IN SELECT * FROM jsonb_array_elements(availability_windows)
  LOOP
    slot_start := (p_date::TEXT || ' ' || (window->>'start'))::TIMESTAMPTZ;

    -- Generate 30-minute slots within this window
    WHILE slot_start < (p_date::TEXT || ' ' || (window->>'end'))::TIMESTAMPTZ
    LOOP
      slot_end := slot_start + (link.duration_minutes || ' minutes')::INTERVAL;

      -- Check if slot is in the future and within constraints
      IF slot_start > current_time + (link.min_notice_hours || ' hours')::INTERVAL
         AND slot_start < current_time + (link.max_days_advance || ' days')::INTERVAL
      THEN
        RETURN QUERY SELECT
          slot_start,
          slot_end,
          is_time_slot_available(link.user_id, slot_start, slot_end);
      END IF;

      -- Move to next slot (every 30 minutes)
      slot_start := slot_start + '30 minutes'::INTERVAL;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create booking and timeline item
CREATE OR REPLACE FUNCTION create_booking_with_calendar_event(
  p_booking_link_id UUID,
  p_start_time TIMESTAMPTZ,
  p_booker_name TEXT,
  p_booker_email TEXT,
  p_booker_timezone TEXT,
  p_custom_responses JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_timeline_item_id UUID;
  v_link RECORD;
  v_end_time TIMESTAMPTZ;
BEGIN
  -- Get booking link details
  SELECT * INTO v_link
  FROM booking_links
  WHERE id = p_booking_link_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking link not found or inactive';
  END IF;

  v_end_time := p_start_time + (v_link.duration_minutes || ' minutes')::INTERVAL;

  -- Check availability
  IF NOT is_time_slot_available(v_link.user_id, p_start_time, v_end_time) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;

  -- Create timeline item for the host
  INSERT INTO timeline_items (
    user_id,
    title,
    start_time,
    duration_minutes,
    is_meeting,
    color,
    status
  ) VALUES (
    v_link.user_id,
    v_link.title || ' with ' || p_booker_name,
    p_start_time,
    v_link.duration_minutes,
    true,
    v_link.color,
    CASE WHEN v_link.require_confirmation THEN 'pending' ELSE 'scheduled' END
  ) RETURNING id INTO v_timeline_item_id;

  -- Create booking
  INSERT INTO bookings (
    booking_link_id,
    user_id,
    start_time,
    end_time,
    duration_minutes,
    booker_name,
    booker_email,
    booker_timezone,
    custom_responses,
    timeline_item_id,
    status
  ) VALUES (
    p_booking_link_id,
    v_link.user_id,
    p_start_time,
    v_end_time,
    v_link.duration_minutes,
    p_booker_name,
    p_booker_email,
    p_booker_timezone,
    p_custom_responses,
    v_timeline_item_id,
    CASE WHEN v_link.require_confirmation THEN 'pending' ELSE 'confirmed' END
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_links_updated_at
  BEFORE UPDATE ON booking_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE booking_links IS 'Shareable booking links for scheduling meetings';
COMMENT ON TABLE bookings IS 'Scheduled meetings created through booking links';
COMMENT ON TABLE booking_analytics IS 'Analytics for booking link views and conversions';
COMMENT ON FUNCTION is_time_slot_available IS 'Check if a time slot is available for booking';
COMMENT ON FUNCTION get_available_slots IS 'Generate available time slots for a specific date';
COMMENT ON FUNCTION create_booking_with_calendar_event IS 'Create booking and add to host calendar';
