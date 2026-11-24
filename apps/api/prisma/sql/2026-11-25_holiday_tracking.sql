-- Holiday tracking and booking (pilot: account CS-1001 only for now). NEW tables only; nothing existing is changed. Safe to run more than once.
-- holiday_settings: one row per account. Year start (default 1 January), carry over, whether managers approve, how many people may be off at once,
--   and the pay multiplier for working a bank holiday (default and per bank holiday). Pay figures are stored only; nothing is calculated from them yet.
-- holiday_staff: the extra per person details held for holiday: start date and the weekday and weekend pay rates (administrators only).
--   The allowance, its unit (hours or days) and contracted hours a week stay where they already are, in staff_details.
-- holiday_requests / holiday_days: a request and the days in it. Only APPROVED days count on the matrix and calendar.
--   Booked = approved with a date after today, taken = approved with a date up to today (worked out by date, no job needed).
-- RLS is on with no policy for anon: only the API reads and writes these tables.

create table if not exists public.holiday_settings (
  tenant_id                text primary key,
  year_start_month         int not null default 1,
  year_start_day           int not null default 1,
  carry_over               boolean not null default false,        -- true: untaken holiday is added to next year, false: it is lost
  manager_approval         boolean not null default false,        -- true: managers approve (like policy approvals), false: administrators only
  max_off                  int,                                   -- most people who may be off on one day; null = no limit
  bank_default_multiplier  numeric(4,2) not null default 1.5,
  bank_overrides           jsonb not null default '{}'::jsonb,    -- { "2026-12-25": 2, ... } per bank holiday date
  updated_at               timestamptz not null default now()
);

create table if not exists public.holiday_staff (
  user_id       text primary key,
  tenant_id     text not null,
  start_date    date,
  weekday_rate  numeric(8,2),
  weekend_rate  numeric(8,2),
  updated_at    timestamptz not null default now()
);
create index if not exists holiday_staff_tenant_idx on public.holiday_staff (tenant_id);

create table if not exists public.holiday_requests (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null,
  user_id       text not null,
  status        text not null default 'pending',   -- pending | approved | rejected | cancelled
  total_hours   numeric(8,2) not null default 0,
  total_days    int not null default 0,
  note          text,                              -- the person's note
  decision_note text,                              -- the approver's note (shown to the person when it is rejected or removed)
  source        text not null default 'hub',       -- hub | admin | import
  requested_at  timestamptz not null default now(),
  decided_by    text,
  decided_by_name text,
  decided_at    timestamptz,
  created_by    text,
  updated_at    timestamptz not null default now()
);
create index if not exists holiday_requests_tenant_status_idx on public.holiday_requests (tenant_id, status, requested_at desc);
create index if not exists holiday_requests_user_idx on public.holiday_requests (user_id, status);

create table if not exists public.holiday_days (
  id          text primary key default gen_random_uuid()::text,
  request_id  text not null,
  tenant_id   text not null,
  user_id     text not null,
  day         date not null,
  hours       numeric(5,2) not null default 8,
  status      text not null default 'pending',     -- copied from the request so the calendar and matrix can read it in one query
  unique (request_id, day)
);
create index if not exists holiday_days_tenant_day_idx on public.holiday_days (tenant_id, day);
create index if not exists holiday_days_user_day_idx on public.holiday_days (user_id, day);

alter table public.holiday_settings enable row level security;
alter table public.holiday_staff enable row level security;
alter table public.holiday_requests enable row level security;
alter table public.holiday_days enable row level security;
