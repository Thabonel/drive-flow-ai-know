-- Weekly Calibration System Tables
-- This migration adds support for the 3-2-1 Attention System weekly calibration features

-- Weekly calibration tracking
CREATE TABLE weekly_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  role_selected TEXT NOT NULL CHECK (role_selected IN ('maker', 'marker', 'multiplier')),
  zone_selected TEXT NOT NULL CHECK (zone_selected IN ('wartime', 'peacetime')),
  non_negotiable TEXT,
  weekly_hours_planned INTEGER CHECK (weekly_hours_planned >= 0),
  role_fit_score INTEGER CHECK (role_fit_score BETWEEN 0 AND 100),
  attention_budget_planned JSONB DEFAULT '{}',
  attention_budget_actual JSONB DEFAULT '{}',
  completion_percentage FLOAT DEFAULT 0.0 CHECK (completion_percentage BETWEEN 0.0 AND 100.0),
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  lessons_learned TEXT,
  calibration_completed_at TIMESTAMPTZ,
  week_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weekly_calibrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own calibrations"
  ON weekly_calibrations FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_weekly_calibrations_user_id ON weekly_calibrations(user_id);
CREATE INDEX idx_weekly_calibrations_week_date ON weekly_calibrations(user_id, week_start_date);

-- Week template configurations for different roles/zones
CREATE TABLE week_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  role_mode TEXT NOT NULL CHECK (role_mode IN ('maker', 'marker', 'multiplier')),
  zone_context TEXT NOT NULL CHECK (zone_context IN ('wartime', 'peacetime')),
  template_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_name)
);

-- Enable RLS
ALTER TABLE week_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own templates"
  ON week_templates FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_week_templates_user_id ON week_templates(user_id);
CREATE INDEX idx_week_templates_role_zone ON week_templates(user_id, role_mode, zone_context);

-- Weekly calibration steps tracking for wizard progress
CREATE TABLE calibration_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_id UUID REFERENCES weekly_calibrations(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 7),
  step_name TEXT NOT NULL,
  step_data JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calibration_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their calibration steps"
  ON calibration_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM weekly_calibrations wc
    WHERE wc.id = calibration_id AND wc.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_calibration_steps_calibration_id ON calibration_steps(calibration_id);

-- Role fit scoring metrics for analytics
CREATE TABLE role_fit_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_id UUID REFERENCES weekly_calibrations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  weight FLOAT DEFAULT 1.0,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE role_fit_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their role fit metrics"
  ON role_fit_metrics FOR ALL
  USING (EXISTS (
    SELECT 1 FROM weekly_calibrations wc
    WHERE wc.id = calibration_id AND wc.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_role_fit_metrics_calibration_id ON role_fit_metrics(calibration_id);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weekly_calibrations_updated_at
  BEFORE UPDATE ON weekly_calibrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_week_templates_updated_at
  BEFORE UPDATE ON week_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default week templates for common role/zone combinations
INSERT INTO week_templates (
  user_id, template_name, role_mode, zone_context, template_config, is_default
)
SELECT
  auth.uid(),
  'Default ' || role_mode || ' - ' || zone_context,
  role_mode,
  zone_context,
  jsonb_build_object(
    'focus_blocks_per_day',
    CASE
      WHEN role_mode = 'maker' THEN 2
      WHEN role_mode = 'marker' THEN 1
      ELSE 0
    END,
    'meeting_limits_per_day',
    CASE
      WHEN role_mode = 'maker' THEN 2
      WHEN role_mode = 'marker' THEN 4
      ELSE 6
    END,
    'non_negotiable_hours_per_week',
    CASE
      WHEN zone_context = 'wartime' THEN 10
      ELSE 5
    END
  ),
  true
FROM (
  VALUES
    ('maker', 'peacetime'),
    ('maker', 'wartime'),
    ('marker', 'peacetime'),
    ('marker', 'wartime'),
    ('multiplier', 'peacetime'),
    ('multiplier', 'wartime')
) AS combinations(role_mode, zone_context)
WHERE auth.uid() IS NOT NULL;