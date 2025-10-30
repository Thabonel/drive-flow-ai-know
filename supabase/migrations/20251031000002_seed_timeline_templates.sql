-- Seed Data: System Default Timeline Templates
-- Populates timeline_templates with system defaults that all users can use

-- ============================================================================
-- PART 1: INSERT SYSTEM DEFAULT TEMPLATES
-- ============================================================================

-- Note: user_id is NULL for system defaults (visible to all users via RLS policy)

INSERT INTO timeline_templates (
  user_id,
  name,
  description,
  duration_minutes,
  default_start_time,
  category,
  color,
  icon,
  is_locked_time,
  is_flexible,
  is_system_default
) VALUES
  -- Sleep (locked, 9 hours)
  (
    NULL,
    'Sleep',
    'Recommended 9 hours of quality sleep for recovery and health',
    540, -- 9 hours
    '22:00:00', -- 10 PM
    'rest',
    '#4c1d95', -- Deep purple
    'moon',
    TRUE, -- Locked time - cannot be moved
    FALSE, -- Not flexible - cannot be compressed
    TRUE -- System default
  ),

  -- Wake/Shower/Dress (flexible, 30 min)
  (
    NULL,
    'Morning Routine',
    'Wake up, shower, get dressed, and prepare for the day',
    30,
    '07:00:00', -- 7 AM
    'personal',
    '#0891b2', -- Cyan
    'sun',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Breakfast (flexible, 30 min)
  (
    NULL,
    'Breakfast',
    'Healthy breakfast to start your day with energy',
    30,
    '07:30:00', -- 7:30 AM
    'meal',
    '#f59e0b', -- Amber
    'coffee',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Lunch (flexible, 45 min)
  (
    NULL,
    'Lunch',
    'Midday meal and mental break',
    45,
    '12:00:00', -- 12 PM
    'meal',
    '#f59e0b', -- Amber
    'utensils',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Dinner (flexible, 60 min)
  (
    NULL,
    'Dinner',
    'Evening meal and family time',
    60,
    '18:00:00', -- 6 PM
    'meal',
    '#f59e0b', -- Amber
    'pizza',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Exercise (flexible, 60 min)
  (
    NULL,
    'Exercise',
    'Physical activity for health and energy',
    60,
    '06:00:00', -- 6 AM
    'health',
    '#dc2626', -- Red
    'dumbbell',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Work Block (flexible, 4 hours)
  (
    NULL,
    'Work Block',
    'Focused work session with deep concentration',
    240, -- 4 hours
    '09:00:00', -- 9 AM
    'work',
    '#3b82f6', -- Blue
    'briefcase',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Commute (flexible, 30 min)
  (
    NULL,
    'Commute',
    'Travel time to/from work or appointments',
    30,
    '08:30:00', -- 8:30 AM
    'travel',
    '#64748b', -- Slate
    'car',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Leisure (flexible, 2 hours)
  (
    NULL,
    'Leisure',
    'Free time for hobbies, relaxation, or entertainment',
    120, -- 2 hours
    '19:00:00', -- 7 PM
    'personal',
    '#8b5cf6', -- Violet
    'gamepad',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Break (flexible, 15 min)
  (
    NULL,
    'Break',
    'Short break for rest and refreshment',
    15,
    NULL, -- No default time
    'rest',
    '#10b981', -- Green
    'coffee',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Additional common templates

  -- Reading (flexible, 60 min)
  (
    NULL,
    'Reading',
    'Time for books, articles, or learning',
    60,
    '20:00:00', -- 8 PM
    'learning',
    '#059669', -- Emerald
    'book-open',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Meeting (flexible, 60 min)
  (
    NULL,
    'Meeting',
    'Scheduled meeting or call',
    60,
    NULL,
    'work',
    '#3b82f6', -- Blue
    'users',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Meditation (flexible, 20 min)
  (
    NULL,
    'Meditation',
    'Mindfulness or meditation practice',
    20,
    '06:30:00', -- 6:30 AM
    'health',
    '#7c3aed', -- Violet
    'sparkles',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Email/Admin (flexible, 30 min)
  (
    NULL,
    'Email & Admin',
    'Handle emails and administrative tasks',
    30,
    '08:00:00', -- 8 AM
    'work',
    '#6366f1', -- Indigo
    'mail',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Family Time (flexible, 90 min)
  (
    NULL,
    'Family Time',
    'Quality time with family',
    90,
    '17:00:00', -- 5 PM
    'social',
    '#ec4899', -- Pink
    'heart',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Preparation (flexible, 20 min)
  (
    NULL,
    'Prepare for Tomorrow',
    'Plan next day, pack bags, set out clothes',
    20,
    '21:00:00', -- 9 PM
    'personal',
    '#0891b2', -- Cyan
    'clipboard-list',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Study (flexible, 90 min)
  (
    NULL,
    'Study',
    'Focused learning or coursework',
    90,
    NULL,
    'learning',
    '#059669', -- Emerald
    'graduation-cap',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Hobby/Creative (flexible, 90 min)
  (
    NULL,
    'Hobby/Creative Work',
    'Creative projects or hobbies',
    90,
    NULL,
    'personal',
    '#8b5cf6', -- Violet
    'palette',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Chores (flexible, 45 min)
  (
    NULL,
    'Household Chores',
    'Cleaning, laundry, and home maintenance',
    45,
    NULL,
    'personal',
    '#64748b', -- Slate
    'home',
    FALSE,
    TRUE,
    TRUE
  ),

  -- Errands (flexible, 60 min)
  (
    NULL,
    'Errands',
    'Shopping, banking, and other errands',
    60,
    NULL,
    'personal',
    '#64748b', -- Slate
    'shopping-cart',
    FALSE,
    TRUE,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 2: VERIFICATION QUERY
-- ============================================================================

-- Query to verify template insertion
DO $$
DECLARE
  v_template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_template_count
  FROM timeline_templates
  WHERE is_system_default = TRUE;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Timeline Templates Seed Data Verification';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'System default templates created: %', v_template_count;
  RAISE NOTICE '=================================================';

  IF v_template_count < 20 THEN
    RAISE WARNING 'Expected 20 templates, but only found %!', v_template_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All system templates created successfully!';
  END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE VIEW FOR TEMPLATE BROWSING
-- ============================================================================

-- View to easily browse templates by category
CREATE OR REPLACE VIEW timeline_templates_by_category AS
SELECT
  category,
  COUNT(*) as template_count,
  json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'duration_minutes', duration_minutes,
      'default_start_time', default_start_time,
      'color', color,
      'icon', icon,
      'is_locked_time', is_locked_time,
      'is_flexible', is_flexible
    ) ORDER BY name
  ) as templates
FROM timeline_templates
WHERE is_system_default = TRUE
GROUP BY category
ORDER BY category;

COMMENT ON VIEW timeline_templates_by_category IS 'System templates organized by category for easy browsing';

-- ============================================================================
-- PART 4: HELPER FUNCTION TO CREATE ITEM FROM TEMPLATE
-- ============================================================================

-- Function to create a timeline item from a template
CREATE OR REPLACE FUNCTION create_item_from_template(
  p_user_id UUID,
  p_layer_id UUID,
  p_template_id UUID,
  p_start_time TIMESTAMPTZ,
  p_custom_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_item_id UUID;
BEGIN
  -- Get template details
  SELECT * INTO v_template
  FROM timeline_templates
  WHERE id = p_template_id
    AND (user_id = p_user_id OR is_system_default = TRUE);

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  -- Create timeline item from template
  INSERT INTO timeline_items (
    user_id,
    layer_id,
    title,
    start_time,
    duration_minutes,
    status,
    color,
    is_locked_time,
    is_flexible,
    template_id,
    original_duration
  ) VALUES (
    p_user_id,
    p_layer_id,
    COALESCE(p_custom_title, v_template.name),
    p_start_time,
    v_template.duration_minutes,
    'active',
    v_template.color,
    v_template.is_locked_time,
    v_template.is_flexible,
    p_template_id,
    v_template.duration_minutes -- Store original duration
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_item_from_template IS 'Creates a timeline item from a template with optional custom title';

-- ============================================================================
-- PART 5: TEMPLATE USAGE ANALYTICS VIEW
-- ============================================================================

-- View to track which templates are most popular
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT
  t.id as template_id,
  t.name,
  t.category,
  t.is_system_default,
  COUNT(ti.id) as times_used,
  COUNT(DISTINCT ti.user_id) as unique_users,
  AVG(ti.duration_minutes) as avg_duration_used,
  MIN(ti.created_at) as first_used,
  MAX(ti.created_at) as last_used
FROM timeline_templates t
LEFT JOIN timeline_items ti ON ti.template_id = t.id
WHERE t.is_system_default = TRUE
GROUP BY t.id, t.name, t.category, t.is_system_default
ORDER BY times_used DESC;

COMMENT ON VIEW template_usage_stats IS 'Analytics on template usage for understanding user behavior';
