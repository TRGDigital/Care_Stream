-- Link any audit (built-in or the home's own) to the free CPD courses and/or the home's own training.
-- Safe to run more than once. Run in the Supabase SQL editor BEFORE the API deploy that uses the table.
create table if not exists public.audit_training_links (
  tenant_id   text not null,
  template_id text not null,
  ref         text not null,
  created_at  timestamp(3) not null default now(),
  primary key (tenant_id, template_id, ref)
);
create index if not exists audit_training_links_tenant_template_idx on public.audit_training_links (tenant_id, template_id);
alter table public.audit_training_links enable row level security;
