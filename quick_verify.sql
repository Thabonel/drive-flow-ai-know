-- Quick Single-Query Verification for Executive-Assistant System
-- Shows everything in one result table

WITH
  table_check AS (
    SELECT
      'TABLES' as component,
      COUNT(*) as installed,
      6 as expected,
      CASE WHEN COUNT(*) = 6 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END as status
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
  ),
  enum_check AS (
    SELECT
      'ENUMS' as component,
      COUNT(DISTINCT typname) as installed,
      7 as expected,
      CASE WHEN COUNT(DISTINCT typname) = 7 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END as status
    FROM pg_type
    WHERE typname IN (
      'user_role_type',
      'subscription_tier',
      'relationship_status',
      'attachment_type',
      'brief_status',
      'storage_provider',
      'audit_action_type'
    )
  ),
  function_check AS (
    SELECT
      'FUNCTIONS' as component,
      COUNT(*) as installed,
      4 as expected,
      CASE WHEN COUNT(*) >= 4 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END as status
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'check_assistant_permission',
        'get_user_role',
        'can_user_access_timeline_item',
        'log_assistant_action'
      )
  ),
  rls_check AS (
    SELECT
      'RLS POLICIES' as component,
      COUNT(*) as installed,
      6 as expected,
      CASE WHEN COUNT(*) = 6 THEN '✓ COMPLETE' ELSE '✗ INCOMPLETE' END as status
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
      AND rowsecurity = true
  ),
  features_check AS (
    SELECT
      'USER_ROLES.features_enabled' as component,
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'features_enabled'
      ) THEN 1 ELSE 0 END as installed,
      1 as expected,
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'features_enabled'
      ) THEN '✓ COMPLETE' ELSE '✗ MISSING' END as status
  )

-- Combine all checks
SELECT * FROM table_check
UNION ALL SELECT * FROM enum_check
UNION ALL SELECT * FROM function_check
UNION ALL SELECT * FROM rls_check
UNION ALL SELECT * FROM features_check
ORDER BY component;
