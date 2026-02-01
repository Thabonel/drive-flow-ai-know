-- Add support for account deletion workflow
-- This migration adds fields and procedures to support GDPR Article 17 (Right to Erasure)

-- Create account deletion requests table for tracking deletion workflows
create table account_deletion_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  requested_at timestamptz default now() not null,
  scheduled_deletion_at timestamptz not null,
  status text not null check (status in ('pending', 'cancelled', 'completed', 'failed')) default 'pending',
  reason text,
  admin_override boolean default false,
  grace_period_days integer not null default 30,
  cancellation_token uuid default gen_random_uuid(),
  ip_address text,
  user_agent text,
  data_export_requested boolean default false,
  data_export_completed_at timestamptz,
  tables_affected text[],
  estimated_records integer default 0,
  actual_records_deleted integer,
  deletion_completed_at timestamptz,
  error_message text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add RLS policies for account deletion requests
alter table account_deletion_requests enable row level security;

-- Users can view and manage their own deletion requests
create policy "Users can view their own deletion requests" on account_deletion_requests
  for select using (auth.uid() = user_id);

create policy "Users can insert their own deletion requests" on account_deletion_requests
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own deletion requests" on account_deletion_requests
  for update using (auth.uid() = user_id);

-- Service role can manage all deletion requests (for admin operations)
create policy "Service role can manage all deletion requests" on account_deletion_requests
  for all with check (true);

-- Add indexes for efficient queries
create index account_deletion_requests_user_id_idx on account_deletion_requests(user_id);
create index account_deletion_requests_status_idx on account_deletion_requests(status);
create index account_deletion_requests_scheduled_deletion_idx on account_deletion_requests(scheduled_deletion_at);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_account_deletion_requests_updated_at
  before update on account_deletion_requests
  for each row execute function update_updated_at_column();

-- Create function to cancel account deletion
create or replace function cancel_account_deletion(
  p_user_id uuid,
  p_cancellation_token uuid
)
returns json as $$
declare
  deletion_request record;
  result json;
begin
  -- Find the active deletion request
  select * into deletion_request
  from account_deletion_requests
  where user_id = p_user_id
    and cancellation_token = p_cancellation_token
    and status = 'pending'
    and scheduled_deletion_at > now();

  if not found then
    return json_build_object(
      'success', false,
      'error', 'No valid deletion request found or cancellation period has expired'
    );
  end if;

  -- Cancel the deletion request
  update account_deletion_requests
  set status = 'cancelled',
      updated_at = now()
  where id = deletion_request.id;

  -- Log the cancellation in audit log
  insert into compliance_audit_log (
    user_id,
    action,
    additional_metadata
  ) values (
    p_user_id,
    'account_deletion_cancelled',
    json_build_object(
      'deletion_request_id', deletion_request.id,
      'originally_scheduled', deletion_request.scheduled_deletion_at,
      'cancellation_token', p_cancellation_token
    )
  );

  -- Update user metadata to remove deletion flag
  -- Note: This would need to be done via the auth admin API in practice

  return json_build_object(
    'success', true,
    'message', 'Account deletion has been successfully cancelled',
    'deletion_request_id', deletion_request.id
  );
end;
$$ language plpgsql security definer;

-- Create function to execute scheduled deletions (for cron job)
create or replace function execute_scheduled_deletions()
returns json as $$
declare
  deletion_request record;
  deleted_count integer := 0;
  error_count integer := 0;
  result json;
begin
  -- Process all pending deletions that are due
  for deletion_request in
    select * from account_deletion_requests
    where status = 'pending'
      and scheduled_deletion_at <= now()
  loop
    begin
      -- Mark as processing
      update account_deletion_requests
      set status = 'processing', updated_at = now()
      where id = deletion_request.id;

      -- Log the start of deletion process
      insert into compliance_audit_log (
        user_id,
        action,
        additional_metadata
      ) values (
        deletion_request.user_id,
        'account_deletion_started',
        json_build_object(
          'deletion_request_id', deletion_request.id,
          'scheduled_deletion', deletion_request.scheduled_deletion_at,
          'grace_period_days', deletion_request.grace_period_days
        )
      );

      -- TODO: Implement actual user and data deletion
      -- This would involve calling auth.admin.deleteUser() and cascading deletes
      -- For now, we just mark as completed for testing

      update account_deletion_requests
      set status = 'completed',
          deletion_completed_at = now(),
          actual_records_deleted = coalesce(estimated_records, 0),
          updated_at = now()
      where id = deletion_request.id;

      deleted_count := deleted_count + 1;

    exception when others then
      -- Handle deletion errors
      update account_deletion_requests
      set status = 'failed',
          error_message = SQLERRM,
          updated_at = now()
      where id = deletion_request.id;

      error_count := error_count + 1;

      -- Log the error
      insert into compliance_audit_log (
        user_id,
        action,
        additional_metadata
      ) values (
        deletion_request.user_id,
        'account_deletion_failed',
        json_build_object(
          'deletion_request_id', deletion_request.id,
          'error_message', SQLERRM
        )
      );
    end;
  end loop;

  return json_build_object(
    'deleted_count', deleted_count,
    'error_count', error_count,
    'processed_at', now()
  );
end;
$$ language plpgsql security definer;

-- Add comments for documentation
comment on table account_deletion_requests is 'Tracks account deletion requests for GDPR Article 17 compliance';
comment on column account_deletion_requests.cancellation_token is 'Unique token for cancelling deletion request during grace period';
comment on column account_deletion_requests.grace_period_days is 'Number of days before actual deletion (typically 30)';
comment on column account_deletion_requests.tables_affected is 'List of database tables that will be affected by the deletion';

comment on function cancel_account_deletion is 'Allows users to cancel their account deletion during grace period';
comment on function execute_scheduled_deletions is 'Processes scheduled account deletions (intended for cron job)';