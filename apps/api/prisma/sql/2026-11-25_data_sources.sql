-- The Data sources register: external reference figures (minimum wage, inflation, bank holidays, sick pay, mileage) that the Ask CareStream agents will quote.
-- NEW tables only; nothing existing is changed. Safe to run more than once. RLS is on with no policy for anon: only the API reads and writes these tables.
-- data_sources: one row per source, holding the LAST GOOD figure, when it takes effect, when it was last checked, and its status
--   (ok | changed | needs_review | failed | manual). A figure that fails to fetch or looks wrong is never stored over the last good one.
-- data_source_history: one row each time a figure changes (or is entered by hand), so the past can always be seen.
create table if not exists public.data_sources (
  key              text primary key,
  name             text not null,
  publisher        text not null default '',
  source_url       text not null default '',
  update_frequency text not null default '',
  effective_from   date,
  value            jsonb,
  previous_value   jsonb,
  fetched_at       timestamptz,
  last_checked_at  timestamptz,
  last_changed_at  timestamptz,
  next_check_due   date,
  status           text not null default 'needs_review',
  last_error       text,
  note             text
);

create table if not exists public.data_source_history (
  id              text primary key default gen_random_uuid()::text,
  key             text not null,
  fetched_at      timestamptz not null default now(),
  effective_from  date,
  value           jsonb,
  status          text not null default 'ok',
  note            text
);
create index if not exists data_source_history_key_idx on public.data_source_history (key, fetched_at desc);

alter table public.data_sources enable row level security;
alter table public.data_source_history enable row level security;
