-- Sickness recording (holiday pilot, CS-1001 only, ADMINISTRATORS ONLY: it is health information). NEW tables only; nothing existing is changed. Safe to run more than once.
-- sick_spells: one run of sickness. last_day is empty while the person is still off (open ended): reports and the calendar count each day up to today until an
--   administrator ends it. hours_default is the usual hours for those open ended days. note is short and optional ("Do not write medical details").
-- sick_days: one row per day they were off (hours and AM/PM/part), so the calendar and the reports are easy to build.
-- Sickness never changes a holiday balance. RLS is on with no policy for anon: only the API reads and writes these tables.
create table if not exists public.sick_spells (
  id                   text primary key default gen_random_uuid()::text,
  tenant_id            text not null,
  user_id              text not null,
  first_day            date not null,
  last_day             date,                                   -- null = still off sick
  note                 text,                                   -- up to 200 characters, administrators only
  kind                 text not null default 'sick',           -- sick | injury | medical appointment
  certificate          text,                                   -- none | self | fit note
  return_to_work_done  boolean not null default false,
  hours_default        numeric(5,2) not null default 8,
  created_by           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists sick_spells_tenant_idx on public.sick_spells (tenant_id, first_day);
create index if not exists sick_spells_user_idx on public.sick_spells (user_id, first_day);

create table if not exists public.sick_days (
  id          text primary key default gen_random_uuid()::text,
  spell_id    text not null,
  tenant_id   text not null,
  user_id     text not null,
  day         date not null,
  hours       numeric(5,2) not null default 8,
  part        text not null default 'full',                    -- full | am | pm | part
  unique (spell_id, day)
);
create index if not exists sick_days_tenant_day_idx on public.sick_days (tenant_id, day);
create index if not exists sick_days_user_day_idx on public.sick_days (user_id, day);

alter table public.sick_spells enable row level security;
alter table public.sick_days enable row level security;
