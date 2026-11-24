-- Resident (or client) funding and fees. NEW tables only; nothing existing is changed. Safe to run more than once. Pilot: CS-1001 only for now.
-- resident_funding is kept APART from the resident profile ("This is me") on purpose. The profile feeds the staff hub, family links, the assistant's knowledge and
-- exports; this table feeds none of them. Only the finance API (administrators only) reads or writes it. There is no Prisma model for it for the same reason:
-- nothing that loads a resident can pull it in by accident. RLS is on with no policy for anon.
-- fee_model: weekly (care home, nursing, dementia) | hourly (home care) | live_in | supported_living | placement (children's homes).
-- funding_type: self | part_self | council | nhs_chc | direct_payment | other.
create table if not exists public.resident_funding (
  id                       text primary key default gen_random_uuid()::text,
  tenant_id                text not null,
  resident_id              text not null,
  fee_model                text not null default 'weekly',
  funding_type             text not null default 'self',
  weekly_fee               numeric(10,2),
  council_name             text,
  council_contribution     numeric(10,2),
  family_contribution      numeric(10,2),
  fnc_contribution         numeric(10,2),
  hourly_rate_weekday      numeric(8,2),
  hourly_rate_weekend      numeric(8,2),
  hourly_rate_bank_holiday numeric(8,2),
  hourly_rate_night        numeric(8,2),
  planned_hours_per_week   numeric(6,2),
  visits_per_week          int,
  visit_minutes            int,
  daily_rate               numeric(10,2),
  placing_authority        text,
  last_review_date         date,
  last_increase_date       date,
  next_review_date         date,
  note                     text,                       -- up to 200 characters, no medical details
  updated_by               text,
  updated_at               timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  unique (resident_id)
);
create index if not exists resident_funding_tenant_idx on public.resident_funding (tenant_id);
create index if not exists resident_funding_review_idx on public.resident_funding (tenant_id, next_review_date);

-- One row per account: whether managers (not only administrators) may see funding.
create table if not exists public.resident_funding_settings (
  tenant_id         text primary key,
  managers_can_see  boolean not null default false,
  updated_at        timestamptz not null default now()
);

alter table public.resident_funding enable row level security;
alter table public.resident_funding_settings enable row level security;
