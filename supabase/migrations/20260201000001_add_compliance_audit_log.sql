-- Create compliance audit log table for GDPR/CCPA compliance tracking
create table compliance_audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  timestamp timestamptz default now() not null,
  ip_address text,
  user_agent text,
  data_types_exported text[],
  additional_metadata jsonb default '{}',
  created_at timestamptz default now() not null
);

-- Add RLS policies for compliance audit log
alter table compliance_audit_log enable row level security;

-- Users can only view their own audit log entries
create policy "Users can view their own audit log entries" on compliance_audit_log
  for select using (auth.uid() = user_id);

-- Service role can insert audit log entries for all users
create policy "Service role can insert audit log entries" on compliance_audit_log
  for insert with check (true);

-- Add index for efficient user-based queries
create index compliance_audit_log_user_id_idx on compliance_audit_log(user_id);
create index compliance_audit_log_timestamp_idx on compliance_audit_log(timestamp);
create index compliance_audit_log_action_idx on compliance_audit_log(action);

-- Add comments for documentation
comment on table compliance_audit_log is 'Tracks user data rights actions for GDPR/CCPA compliance';
comment on column compliance_audit_log.action is 'Type of compliance action: data_export, data_deletion, account_deletion, etc.';
comment on column compliance_audit_log.data_types_exported is 'Array of data types included in export operations';
comment on column compliance_audit_log.additional_metadata is 'Additional compliance-related metadata for the action';