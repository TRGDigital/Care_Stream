-- Missing policies a tenant has chosen to ignore on /gaps. Additive. RLS on with no policies:
-- only the API (table owner) reads and writes it.
-- Applied 2026-09-17 via Supabase MCP (migration missing_policy_ignores).
create table if not exists public.missing_policy_ignores (
  id              text primary key default gen_random_uuid()::text,
  tenant_id       text not null,
  policy_title    text not null,
  ignored_by      text,
  ignored_by_name text,
  ignored_at      timestamp(3) not null default current_timestamp
);
create unique index if not exists missing_policy_ignores_tenant_id_policy_title_key on public.missing_policy_ignores (tenant_id, policy_title);
create index if not exists missing_policy_ignores_tenant_id_idx on public.missing_policy_ignores (tenant_id);
alter table public.missing_policy_ignores enable row level security;
