-- Favourite (starred) audits, saved against the user instead of the browser.
-- Safe to run more than once. Run in the Supabase SQL editor BEFORE the API deploy that uses the table.
create table if not exists public.audit_favourites (
  user_id     text not null,
  template_id text not null,
  tenant_id   text not null,
  created_at  timestamp(3) not null default now(),
  primary key (user_id, template_id)
);
create index if not exists audit_favourites_tenant_user_idx on public.audit_favourites (tenant_id, user_id);
alter table public.audit_favourites enable row level security;
select count(*) from public.audit_favourites;
