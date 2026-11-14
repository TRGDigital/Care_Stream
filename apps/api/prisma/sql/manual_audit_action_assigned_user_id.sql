-- Audit actions are owned by a user id, not just a name (a rename or two people with one name used to break ownership).
-- Safe to run more than once. Run in the Supabase SQL editor BEFORE the API deploy that uses the column.
alter table public.audit_actions add column if not exists assigned_user_id text;
create index if not exists audit_actions_tenant_assignee_idx on public.audit_actions (tenant_id, assigned_user_id);

-- Backfill: set the id where the stored name matches exactly one active user in that tenant.
update public.audit_actions a
   set assigned_user_id = u.id
  from public.users u
 where a.assigned_user_id is null and a.assigned_to is not null and coalesce(a.is_external, false) = false
   and u.tenant_id = a.tenant_id and u.is_active
   and lower(trim(u.name)) = lower(trim(a.assigned_to))
   and (select count(*) from public.users u2 where u2.tenant_id = a.tenant_id and u2.is_active and lower(trim(u2.name)) = lower(trim(a.assigned_to))) = 1;

select count(*) filter (where assigned_user_id is not null) as linked, count(*) filter (where assigned_to is not null and assigned_user_id is null and not is_external) as name_only from public.audit_actions;
