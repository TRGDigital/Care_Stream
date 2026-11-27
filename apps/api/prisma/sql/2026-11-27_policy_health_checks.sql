-- Policy health checks (pilot, CS-1001 only): the score out of 100 for one policy, worked out from six dimensions, and what to fix first.
-- NEW table only; nothing existing is changed. Safe to run more than once. RLS on with no policy for anon: only the API reads and writes it.
create table if not exists public.policy_health_checks (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  policy_id        text not null,
  policy_name      text not null default '',
  policy_version   int not null default 1,
  score            int not null default 0,
  band             text not null default 'none',
  assessed         int not null default 0,
  dims             jsonb not null default '[]'::jsonb,
  fixes            jsonb not null default '[]'::jsonb,
  included_stress  boolean not null default true,
  run_by           text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists policy_health_checks_policy_idx on public.policy_health_checks (tenant_id, policy_id, created_at desc);
alter table public.policy_health_checks enable row level security;
