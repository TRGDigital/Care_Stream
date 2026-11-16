-- Saved result of the platform "Missing against our policy catalogue" check, one row per client.
create table if not exists catalogue_gap_runs (
  tenant_id text primary key,
  ran_at    timestamptz not null default now(),
  payload   jsonb not null
);
