-- Policy clarity and precision (pilot, CS-1001 only): the vague wording found in a policy, quoted, with a suggested rewrite.
-- NEW table only; nothing existing is changed. Safe to run more than once. RLS on with no policy for anon: only the API reads and writes it.
create table if not exists public.policy_clarity_results (
  id             text primary key default gen_random_uuid()::text,
  tenant_id      text not null,
  policy_id      text not null,
  policy_name    text not null default '',
  findings       jsonb not null default '[]'::jsonb,
  metrics        jsonb not null default '{}'::jsonb,
  band           text not null default 'none',
  finding_count  int not null default 0,
  summary        text not null default '',
  prompt_hash    text not null default '',
  run_by         text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists policy_clarity_results_policy_idx on public.policy_clarity_results (tenant_id, policy_id, created_at desc);
alter table public.policy_clarity_results enable row level security;
