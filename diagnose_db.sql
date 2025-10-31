-- Quick diagnostic: What exists from the executive-assistant migration?

-- Check which tables exist
SELECT
  'Tables that exist:' as info,
  string_agg(table_name, ', ') as tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_roles',
    'assistant_relationships',
    'timeline_documents',
    'timeline_item_documents',
    'executive_daily_briefs',
    'assistant_audit_log'
  );

-- Check which enum types exist
SELECT
  'Enum types that exist:' as info,
  string_agg(typname, ', ') as types
FROM pg_type
WHERE typname IN (
  'user_role_type',
  'subscription_tier',
  'relationship_status',
  'attachment_type',
  'brief_status',
  'storage_provider',
  'audit_action_type'
);

-- Check which functions exist
SELECT
  'Functions that exist:' as info,
  string_agg(routine_name, ', ') as functions
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_assistant_permission',
    'get_user_role',
    'can_user_access_timeline_item',
    'log_assistant_action',
    'setup_default_user_role',
    'auto_log_timeline_item_changes',
    'auto_log_document_actions'
  );
