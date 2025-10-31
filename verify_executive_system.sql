-- Verification Script for Executive-Assistant System
-- Run this in Supabase SQL Editor to verify all tables and features are working

SELECT '========================================' as divider;
SELECT 'EXECUTIVE-ASSISTANT SYSTEM VERIFICATION' as title;
SELECT '========================================' as divider;

-- Check 1: Verify all tables exist
SELECT 'Check 1: Tables Created' as check_name;
SELECT
  table_name,
  CASE
    WHEN table_name IN ('user_roles', 'assistant_relationships', 'timeline_documents',
                        'timeline_item_documents', 'executive_daily_briefs', 'assistant_audit_log')
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_roles',
    'assistant_relationships',
    'timeline_documents',
    'timeline_item_documents',
    'executive_daily_briefs',
    'assistant_audit_log'
  )
ORDER BY table_name;

SELECT '========================================' as divider;

-- Check 2: Verify user_roles has all required columns
SELECT 'Check 2: user_roles Columns' as check_name;
SELECT
  column_name,
  data_type,
  CASE WHEN is_nullable = 'NO' THEN 'NOT NULL' ELSE 'NULLABLE' END as nullability,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

SELECT '========================================' as divider;

-- Check 3: Verify enum types exist
SELECT 'Check 3: Enum Types' as check_name;
SELECT
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN (
  'user_role_type',
  'subscription_tier',
  'relationship_status',
  'attachment_type',
  'brief_status',
  'storage_provider',
  'audit_action_type'
)
GROUP BY typname
ORDER BY typname;

SELECT '========================================' as divider;

-- Check 4: Verify RLS is enabled
SELECT 'Check 4: Row Level Security' as check_name;
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'assistant_relationships',
    'timeline_documents',
    'timeline_item_documents',
    'executive_daily_briefs',
    'assistant_audit_log'
  )
ORDER BY tablename;

SELECT '========================================' as divider;

-- Check 5: Verify helper functions exist
SELECT 'Check 5: Helper Functions' as check_name;
SELECT
  routine_name as function_name,
  '✓ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_assistant_permission',
    'get_user_role',
    'can_user_access_timeline_item',
    'log_assistant_action',
    'setup_default_user_role'
  )
ORDER BY routine_name;

SELECT '========================================' as divider;

-- Check 6: Verify triggers exist
SELECT 'Check 6: Triggers' as check_name;
SELECT
  event_object_table as table_name,
  trigger_name,
  '✓ EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (
    trigger_name LIKE '%user_roles%'
    OR trigger_name LIKE '%timeline_item%'
    OR trigger_name LIKE '%document%'
    OR trigger_name LIKE '%brief%'
  )
ORDER BY event_object_table, trigger_name;

SELECT '========================================' as divider;

-- Check 7: Verify indexes exist
SELECT 'Check 7: Performance Indexes' as check_name;
SELECT
  tablename,
  indexname,
  '✓ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'assistant_relationships',
    'timeline_documents',
    'timeline_item_documents',
    'executive_daily_briefs',
    'assistant_audit_log'
  )
ORDER BY tablename, indexname;

SELECT '========================================' as divider;

-- Check 8: Count existing data
SELECT 'Check 8: Current Data Counts' as check_name;
SELECT 'user_roles' as table_name, COUNT(*) as row_count FROM user_roles
UNION ALL
SELECT 'assistant_relationships', COUNT(*) FROM assistant_relationships
UNION ALL
SELECT 'timeline_documents', COUNT(*) FROM timeline_documents
UNION ALL
SELECT 'timeline_item_documents', COUNT(*) FROM timeline_item_documents
UNION ALL
SELECT 'executive_daily_briefs', COUNT(*) FROM executive_daily_briefs
UNION ALL
SELECT 'assistant_audit_log', COUNT(*) FROM assistant_audit_log;

SELECT '========================================' as divider;
SELECT '✓ VERIFICATION COMPLETE' as status;
SELECT '========================================' as divider;
