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
