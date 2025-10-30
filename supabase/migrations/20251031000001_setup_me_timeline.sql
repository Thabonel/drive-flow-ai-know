-- Setup "Me" Timeline for Existing Users
-- This creates a default primary magnetic timeline for all users who don't have one yet

-- ============================================================================
-- PART 1: CREATE DEFAULT "ME" TIMELINE FOR EXISTING USERS
-- ============================================================================

-- Create "Me" timeline for all existing users who don't have a primary timeline
INSERT INTO timeline_layers (user_id, name, color, sort_order, is_visible, is_primary_timeline, timeline_type)
SELECT
  u.id as user_id,
  'Me' as name,
  '#3b82f6' as color, -- Blue color
  0 as sort_order, -- Always first
  TRUE as is_visible,
  TRUE as is_primary_timeline,
  'magnetic' as timeline_type
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM timeline_layers tl
  WHERE tl.user_id = u.id
    AND tl.is_primary_timeline = TRUE
);

-- ============================================================================
-- PART 2: UPDATE SORT ORDER FOR EXISTING LAYERS
-- ============================================================================

-- Shift sort_order of existing layers to make room for "Me" timeline at position 0
WITH updated_layers AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order) as new_order
  FROM timeline_layers
  WHERE is_primary_timeline = FALSE
)
UPDATE timeline_layers tl
SET sort_order = ul.new_order,
    updated_at = NOW()
FROM updated_layers ul
WHERE tl.id = ul.id;

-- ============================================================================
-- PART 3: CREATE FUNCTION TO AUTO-CREATE "ME" TIMELINE FOR NEW USERS
-- ============================================================================

-- Function to create default "Me" timeline when a new user signs up
CREATE OR REPLACE FUNCTION create_default_me_timeline()
RETURNS TRIGGER AS $$
BEGIN
  -- Create "Me" timeline for new user
  INSERT INTO timeline_layers (user_id, name, color, sort_order, is_visible, is_primary_timeline, timeline_type)
  VALUES (
    NEW.id,
    'Me',
    '#3b82f6',
    0,
    TRUE,
    TRUE,
    'magnetic'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create "Me" timeline for new users
CREATE TRIGGER create_me_timeline_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_me_timeline();

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Create a view to easily check "Me" timeline status
CREATE OR REPLACE VIEW user_me_timeline_status AS
SELECT
  u.id as user_id,
  u.email,
  tl.id as me_timeline_id,
  tl.name as timeline_name,
  tl.is_primary_timeline,
  tl.timeline_type,
  tl.created_at as timeline_created_at,
  COUNT(ti.id) as item_count,
  COALESCE(SUM(ti.duration_minutes), 0) as total_duration_minutes
FROM auth.users u
LEFT JOIN timeline_layers tl ON tl.user_id = u.id AND tl.is_primary_timeline = TRUE
LEFT JOIN timeline_items ti ON ti.layer_id = tl.id AND ti.status != 'parked'
GROUP BY u.id, u.email, tl.id, tl.name, tl.is_primary_timeline, tl.timeline_type, tl.created_at
ORDER BY u.created_at DESC;

COMMENT ON VIEW user_me_timeline_status IS 'Shows status of each users "Me" timeline including item count and total duration';

-- ============================================================================
-- PART 5: MIGRATION VERIFICATION REPORT
-- ============================================================================

-- Query to run after migration to verify success
DO $$
DECLARE
  v_total_users INTEGER;
  v_users_with_me_timeline INTEGER;
  v_users_without_me_timeline INTEGER;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM auth.users;

  -- Count users with "Me" timeline
  SELECT COUNT(DISTINCT user_id) INTO v_users_with_me_timeline
  FROM timeline_layers
  WHERE is_primary_timeline = TRUE;

  -- Calculate users without
  v_users_without_me_timeline := v_total_users - v_users_with_me_timeline;

  -- Log results
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Me Timeline Setup Verification Report';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Users with Me timeline: %', v_users_with_me_timeline;
  RAISE NOTICE 'Users without Me timeline: %', v_users_without_me_timeline;
  RAISE NOTICE '=================================================';

  -- Raise warning if any users are missing "Me" timeline
  IF v_users_without_me_timeline > 0 THEN
    RAISE WARNING 'WARNING: % user(s) are missing the Me timeline!', v_users_without_me_timeline;
  ELSE
    RAISE NOTICE 'SUCCESS: All users have a Me timeline configured!';
  END IF;
END $$;
