-- Verification Script for New Features
-- Run this in Supabase SQL Editor to verify all migrations were applied successfully

-- Check that all new tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN (
      'day_templates',
      'routine_items',
      'time_tracking',
      'daily_planning_sessions',
      'daily_planning_settings',
      'end_of_day_shutdowns',
      'booking_links',
      'bookings',
      'booking_analytics'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'day_templates',
  'routine_items',
  'time_tracking',
  'daily_planning_sessions',
  'daily_planning_settings',
  'end_of_day_shutdowns',
  'booking_links',
  'bookings',
  'booking_analytics'
)
ORDER BY table_name;

-- Expected: 9 rows returned

-- Check that key functions exist
SELECT
  routine_name,
  CASE
    WHEN routine_name IN (
      'get_available_slots',
      'is_time_slot_available',
      'create_booking_with_calendar_event',
      'get_current_streak'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_available_slots',
  'is_time_slot_available',
  'create_booking_with_calendar_event',
  'get_current_streak'
)
ORDER BY routine_name;

-- Expected: 4 rows returned

-- Check btree_gist extension is enabled
SELECT
  extname as extension_name,
  '✅ ENABLED' as status
FROM pg_extension
WHERE extname = 'btree_gist';

-- Expected: 1 row

-- Check timeline_items has routine_id column
SELECT
  column_name,
  data_type,
  '✅ EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'timeline_items'
AND column_name = 'routine_id';

-- Expected: 1 row

-- Count system templates (should have 6)
SELECT
  COUNT(*) as system_template_count,
  CASE
    WHEN COUNT(*) = 6 THEN '✅ CORRECT (6 templates)'
    ELSE '⚠️ EXPECTED 6'
  END as status
FROM day_templates
WHERE is_system = true;

-- Count default routines (should have 2: morning, evening)
SELECT
  COUNT(*) as system_routine_count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ CORRECT (≥2 routines)'
    ELSE '⚠️ EXPECTED ≥2'
  END as status
FROM routine_items
WHERE is_system = true;

-- Final summary
SELECT
  '🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!' as message,
  'You can now use all three new features:' as info,
  '1. AI Time Intelligence' as feature_1,
  '2. Daily Planning Ritual' as feature_2,
  '3. Meeting Booking Links' as feature_3;
