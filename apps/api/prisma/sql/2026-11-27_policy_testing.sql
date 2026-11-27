-- Policy testing (pilot, CS-1001 only): real-world situations a policy is tested against, and the results.
-- NEW tables only; nothing existing is changed. Safe to run more than once. RLS on with no policy for anon: only the API reads and writes them.
create table if not exists public.policy_scenarios (
  id                  text primary key default gen_random_uuid()::text,
  title               text not null,
  description         text not null default '',
  policy_types        text[] not null default '{}',
  settings            text[] not null default '{}',
  regulation_keys     text[] not null default '{}',
  expected_points     jsonb not null default '[]'::jsonb,
  extra_instructions  text not null default '',
  status              text not null default 'draft',
  version             int not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists policy_scenarios_status_idx on public.policy_scenarios (status);

create table if not exists public.policy_stress_results (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null,
  policy_id         text not null,
  policy_name       text not null default '',
  scenario_id       text not null,
  scenario_version  int not null default 1,
  scenario_title    text not null default '',
  points            jsonb not null default '[]'::jsonb,
  summary           text not null default '',
  gaps              int not null default 0,
  prompt_hash       text not null default '',
  run_by            text not null default '',
  created_at        timestamptz not null default now()
);
create index if not exists policy_stress_results_policy_idx on public.policy_stress_results (tenant_id, policy_id, created_at desc);
create index if not exists policy_stress_results_scenario_idx on public.policy_stress_results (scenario_id);

alter table public.policy_scenarios enable row level security;
alter table public.policy_stress_results enable row level security;
