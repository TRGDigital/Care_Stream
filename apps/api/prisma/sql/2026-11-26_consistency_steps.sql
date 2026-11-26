-- Cross-policy comparison, in small saved steps (so one long call can never be cut off, and Resume carries on from the last finished step).
-- NEW table only; nothing existing is changed. Safe to run more than once. Until it exists the comparison runs as one call, as before.
-- step 0 holds the plan (the groups to compare), steps 1..n each hold the result of one small slice. All of it is deleted when the comparison finishes.
-- RLS is on with no policy for anon: only the API reads and writes this table.
create table if not exists public.policy_consistency_steps (
  tenant_id   text not null,
  step        int  not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, step)
);
alter table public.policy_consistency_steps enable row level security;
