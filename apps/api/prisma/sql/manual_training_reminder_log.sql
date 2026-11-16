-- Weekly training reminders: one row per email sent. The unique key stops a person getting the same kind of email twice in one week,
-- and the rows are how weeks without activity are counted for the six week pause. Previews are never logged.
create table if not exists public.training_reminder_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  user_id         uuid not null,
  kind            text not null,            -- staff_weekly | admin_digest
  week_start      date not null,            -- the Monday (Europe/London) of the week it was sent for
  email_to        text,
  outstanding     integer not null default 0,
  overdue         integer not null default 0,
  never_signed_in boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, kind, week_start)
);
create index if not exists training_reminder_log_tenant_idx on public.training_reminder_log (tenant_id, created_at);
alter table public.training_reminder_log enable row level security;

-- Monday 09:30 UTC (09:30 UK in winter, 10:30 in summer), through the same scheduler as the other jobs.
-- select cron.schedule('cs-training-weekly-reminders', '30 9 * * 1', $$select public.carestream_cron('training-weekly-reminders')$$);
