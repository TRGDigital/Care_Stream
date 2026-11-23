-- Workforce compliance expansion (Enterprise): personal details, contract and holiday entitlement, more credential types,
-- birthday emails. NEW tables and NEW nullable columns only; nothing existing is changed or dropped. Safe to run more than once.
-- Until this is run the new tabs show empty and the routes answer "not set up yet"; nothing else is affected.

-- 1. Extra detail on credentials: registration body (NMC, GPhC, HCPC...) and visa sponsorship end date.
alter table public.staff_credentials add column if not exists registration_body text;
alter table public.staff_credentials add column if not exists sponsorship_ends_at timestamptz;

-- 2. One row per staff member: date of birth, emergency contact, next of kin, contract details, holiday entitlement.
create table if not exists public.staff_details (
  id                     text primary key default gen_random_uuid()::text,
  tenant_id              text not null,
  user_id                text not null,
  date_of_birth          date,
  emergency_name         text,
  emergency_relationship text,
  emergency_phone        text,
  emergency_phone_alt    text,
  nok_name               text,
  nok_relationship       text,
  nok_phone              text,
  nok_address            text,
  contract_type          text,                 -- permanent | fixed_term | bank | zero_hours
  contract_hours_per_week numeric(6,2),
  probation_ends_on      date,
  holiday_entitlement    numeric(7,2),         -- per year, in holiday_unit
  holiday_unit           text not null default 'days',   -- days | hours
  holiday_year_start     date,                 -- optional per person override of the account's year start
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index if not exists staff_details_user_idx on public.staff_details (user_id);
create index if not exists staff_details_tenant_idx on public.staff_details (tenant_id);

-- 3. Account level workforce settings: the holiday year start (month and day).
create table if not exists public.workforce_settings (
  tenant_id            text primary key,
  holiday_year_start_month int not null default 4,
  holiday_year_start_day   int not null default 1,
  updated_at           timestamptz not null default now()
);

-- 4. Birthday emails already sent, so a re-run of the daily job never sends twice.
create table if not exists public.staff_birthday_log (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null,
  user_id    text not null,
  kind       text not null,        -- admin_notice | staff_greeting
  year       int  not null,
  sent_at    timestamptz not null default now()
);
create unique index if not exists staff_birthday_log_uniq on public.staff_birthday_log (user_id, kind, year);

-- Row level security on with no policy for anon, so only the API (service role) can read or write. Date of birth is personal data.
alter table public.staff_details enable row level security;
alter table public.workforce_settings enable row level security;
alter table public.staff_birthday_log enable row level security;
