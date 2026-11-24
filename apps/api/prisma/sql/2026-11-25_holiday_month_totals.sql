-- Holiday tracking: monthly figures loaded from the old spreadsheet (the matrix). New table only; nothing existing is changed. Safe to run more than once.
-- One row per person per month: hours already TAKEN and hours BOOKED, with no dates. They are added to the matrix and the totals (in the person's own unit)
-- but do not appear on the calendar. Loading the same file again replaces these rows, so figures are never counted twice.
-- RLS is on with no policy for anon: only the API reads and writes this table.
create table if not exists public.holiday_month_totals (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null,
  user_id       text not null,
  year          int  not null,
  month         int  not null check (month between 1 and 12),
  taken_hours   numeric(8,2) not null default 0,
  booked_hours  numeric(8,2) not null default 0,
  source        text not null default 'import',
  updated_at    timestamptz not null default now(),
  unique (tenant_id, user_id, year, month)
);
create index if not exists holiday_month_totals_tenant_year_idx on public.holiday_month_totals (tenant_id, year);
alter table public.holiday_month_totals enable row level security;
