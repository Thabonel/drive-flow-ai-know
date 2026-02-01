-- Create security incidents table for incident response automation
create table security_incidents (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('BRUTE_FORCE_ATTEMPT', 'SUSPICIOUS_ACCESS', 'RATE_LIMIT_EXCEEDED')),
  severity text not null check (severity in ('HIGH', 'MEDIUM', 'LOW')),
  user_id uuid references auth.users(id) on delete set null,
  ip_address text not null,
  detected_at timestamptz default now() not null,
  details jsonb default '{}',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'RESOLVED', 'FALSE_POSITIVE')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add RLS policies for security incidents
alter table security_incidents enable row level security;

-- Admin users can view all security incidents
create policy "Admin users can view all security incidents" on security_incidents
  for select using (
    exists (
      select 1 from user_settings
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Admin users can update security incidents (resolve, mark as false positive)
create policy "Admin users can update security incidents" on security_incidents
  for update using (
    exists (
      select 1 from user_settings
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Service role can insert security incidents
create policy "Service role can insert security incidents" on security_incidents
  for insert with check (true);

-- Add indexes for efficient queries
create index security_incidents_type_idx on security_incidents(type);
create index security_incidents_severity_idx on security_incidents(severity);
create index security_incidents_status_idx on security_incidents(status);
create index security_incidents_detected_at_idx on security_incidents(detected_at);
create index security_incidents_ip_address_idx on security_incidents(ip_address);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_security_incidents_updated_at
    before update on security_incidents
    for each row
    execute function update_updated_at_column();

-- Add comments for documentation
comment on table security_incidents is 'Tracks security incidents detected by automated monitoring';
comment on column security_incidents.type is 'Type of security incident detected';
comment on column security_incidents.severity is 'Severity level of the incident';
comment on column security_incidents.details is 'Additional metadata about the incident';
comment on column security_incidents.status is 'Current status of the incident';