-- "This is me" family reminders (Professional and Enterprise plans). Adds to 2026-11-17_resident_profiles.sql.
-- resident_reminder_settings: one row per family contact (a family invite) that a manager has set reminders for.
--   cadence       off | weekly | fortnightly | monthly
--   weekday       preferred day to send, 0 Sunday to 6 Saturday (null = any day)
--   paused_until  no reminder before this date (null = not paused)
--   unanswered_count  reminders sent in a row with no reply; after 3 the job stops and managers are told. A reply resets it.
--   last_sent_at / next_due_at / last_reply_at  what the daily job and the family tab show
-- The "Stop these reminders" link in each email is signed (HMAC), so nothing about it is stored here.
-- Safe to run more than once.

create table if not exists public.resident_reminder_settings (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null,
  resident_id       text not null,
  invite_id         text not null,                       -- the family contact (resident_invites.id)
  cadence           text not null default 'off',
  weekday           integer,
  paused_until      date,
  unanswered_count  integer not null default 0,
  last_sent_at      timestamptz,
  last_reply_at     timestamptz,
  next_due_at       timestamptz,
  stopped_at        timestamptz,                         -- set when the family member used the stop link
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists resident_reminder_settings_invite_idx on public.resident_reminder_settings (invite_id);
create index if not exists resident_reminder_settings_due_idx on public.resident_reminder_settings (cadence, next_due_at);
create index if not exists resident_reminder_settings_resident_idx on public.resident_reminder_settings (tenant_id, resident_id);

-- Same as the other resident tables: row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.resident_reminder_settings enable row level security;

-- Run once to start the daily job (same helper as the other jobs, 09:30 UTC).
-- select cron.unschedule('cs-family-reminders') where exists (select 1 from cron.job where jobname = 'cs-family-reminders');
-- select cron.schedule('cs-family-reminders', '30 9 * * *', $$select public.carestream_cron('family-reminders')$$);
