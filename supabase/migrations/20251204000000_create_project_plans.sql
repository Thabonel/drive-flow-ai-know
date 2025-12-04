-- Migration: Create project_plans table for Plan-to-Timeline feature
--
-- Architecture: "Tetris" Constraint Satisfaction
-- - User defines block sizes (durations) - IMMUTABLE
-- - AI places blocks in grid (calendar) - SCHEDULING ONLY
-- - AI NEVER modifies duration values

-- ============================================================================
-- PROJECT PLANS TABLE
-- ============================================================================

CREATE TABLE project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan Metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Source Content (what user wrote)
  source_content TEXT NOT NULL,  -- Original markdown/text
  source_type TEXT NOT NULL DEFAULT 'markdown'
    CHECK (source_type IN ('markdown', 'json', 'natural')),

  -- Parsed Tasks (extracted by REGEX, not AI)
  -- Structure enforces immutability of user durations
  parsed_tasks JSONB NOT NULL DEFAULT '[]',
  /*
    JSONB Structure:
    [
      {
        "id": "task_uuid",
        "index": 0,
        "title": "Setup PWA",
        "description": "Add manifest and service worker",
        "user_defined_duration_minutes": 60,  // IMMUTABLE - set by regex parser
        "dependencies": [],                    // Task IDs that must complete first
        "constraints": {
          "can_split": false,                  // Can task span multiple days?
          "preferred_time": null,              // "morning" | "afternoon" | null
          "layer_id": null                     // Specific layer preference
        },
        "schedule": {
          "status": "unscheduled",             // "unscheduled" | "scheduled" | "completed"
          "scheduled_date": null,              // "2024-12-09"
          "scheduled_start": null,             // "09:00"
          "scheduled_end": null,               // "10:00"
          "timeline_item_id": null,            // UUID after applied
          "split_info": null                   // If split: { part: 1, total_parts: 2 }
        },
        "color": "#3b82f6",
        "is_flexible": true
      }
    ]
  */

  -- Scheduling Preferences
  target_start_date DATE,
  working_hours_start TIME NOT NULL DEFAULT '09:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00',
  max_minutes_per_day INTEGER NOT NULL DEFAULT 360,  -- 6 hours default
  skip_weekends BOOLEAN NOT NULL DEFAULT true,
  allow_task_splitting BOOLEAN NOT NULL DEFAULT false,

  -- Calculated Totals (updated on parse)
  total_tasks INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  estimated_days INTEGER,  -- Calculated based on constraints

  -- Plan State
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'parsed', 'scheduled', 'applied', 'in_progress', 'completed', 'archived')),

  -- Tracking
  parsed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Validation
  validation_errors JSONB DEFAULT '[]',  -- Any parsing/validation issues

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_project_plans_user_id ON project_plans(user_id);
CREATE INDEX idx_project_plans_status ON project_plans(status);
CREATE INDEX idx_project_plans_target_date ON project_plans(target_start_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_plans ENABLE ROW LEVEL SECURITY;

-- Users can only see their own plans
CREATE POLICY "Users can view own plans"
  ON project_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own plans
CREATE POLICY "Users can create own plans"
  ON project_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own plans
CREATE POLICY "Users can update own plans"
  ON project_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own plans
CREATE POLICY "Users can delete own plans"
  ON project_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LINK TIMELINE ITEMS TO PLANS
-- ============================================================================

-- Add columns to timeline_items to track plan source
ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES project_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_task_id TEXT;  -- Matches parsed_tasks[].id

CREATE INDEX idx_timeline_items_plan_id ON timeline_items(plan_id) WHERE plan_id IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate estimated days based on constraints
CREATE OR REPLACE FUNCTION calculate_plan_estimated_days(
  p_total_minutes INTEGER,
  p_max_minutes_per_day INTEGER,
  p_skip_weekends BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
  work_days INTEGER;
  calendar_days INTEGER;
BEGIN
  -- Calculate work days needed
  work_days := CEIL(p_total_minutes::FLOAT / GREATEST(p_max_minutes_per_day, 1));

  IF NOT p_skip_weekends THEN
    RETURN work_days;
  END IF;

  -- Add weekend days (rough estimate: for every 5 work days, add 2 weekend days)
  calendar_days := work_days + (work_days / 5) * 2;

  RETURN calendar_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update calculated fields on plan update
CREATE OR REPLACE FUNCTION update_plan_calculated_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Count tasks and sum durations from parsed_tasks JSONB
  SELECT
    COALESCE(jsonb_array_length(NEW.parsed_tasks), 0),
    COALESCE((
      SELECT SUM((task->>'user_defined_duration_minutes')::INTEGER)
      FROM jsonb_array_elements(NEW.parsed_tasks) AS task
    ), 0)
  INTO NEW.total_tasks, NEW.total_duration_minutes;

  -- Calculate estimated days
  NEW.estimated_days := calculate_plan_estimated_days(
    NEW.total_duration_minutes,
    NEW.max_minutes_per_day,
    NEW.skip_weekends
  );

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_calculated_fields
  BEFORE INSERT OR UPDATE OF parsed_tasks, max_minutes_per_day, skip_weekends
  ON project_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_calculated_fields();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE project_plans IS
'Stores user-created project plans for the Plan-to-Timeline feature.
CRITICAL: Duration values in parsed_tasks are set by regex parser, NOT by AI.
AI only schedules (assigns start/end times), never modifies durations.';

COMMENT ON COLUMN project_plans.parsed_tasks IS
'JSONB array of tasks with USER-DEFINED durations. The user_defined_duration_minutes
field is IMMUTABLE after parsing. AI scheduling only modifies the schedule sub-object.';

COMMENT ON COLUMN project_plans.source_content IS
'Original content as written by user (markdown with [duration: Xh] tags).
Preserved for re-parsing if needed.';
