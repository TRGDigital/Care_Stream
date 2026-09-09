-- Heartbeat for scheduled jobs.
--
-- Every cron endpoint records a row here: when it started, when it finished, whether it
-- succeeded, and what it actually did. The point is not the history, it is the ABSENCE:
-- eight jobs stopped on 5 June 2026 and nobody found out for 96 days, because nothing
-- anywhere recorded that they were supposed to have run. A row that never appears is the
-- signal, so the daily report reads expected jobs against this table rather than the other
-- way round.

create table if not exists cron_runs (
  id           text primary key default gen_random_uuid()::text,
  job          text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean not null default false,
  -- Whatever the job returned: counts, tenants touched, URLs checked. Kept as JSON so a new
  -- job needs no schema change, and so the report can show what was captured, not just "ok".
  summary      jsonb,
  error        text not null default '',
  duration_ms  integer
);

-- The report asks "did job X run since Y", so this is the index it needs.
create index if not exists cron_runs_job_started_idx on cron_runs (job, started_at desc);
create index if not exists cron_runs_started_idx     on cron_runs (started_at desc);

-- Server-side only: no tenant ever reads this, and RLS-on with no policy denies by default,
-- which is what we want for a platform-operations table.
alter table cron_runs enable row level security;
