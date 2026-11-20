-- Scenario pages written by the nightly routine (and published from /platform/blog > Scenarios).
-- The 93 older scenarios stay in the repository (apps/web/src/data/scenarios); this table holds the new ones.
-- Additive. Safe to run before the deploy.
create table if not exists scenario_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  status       text not null default 'draft',   -- 'draft' | 'published'
  sort_order   integer not null default 0,
  data         jsonb not null,                   -- the whole page, same shape as src/data/scenarios/*.json
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists scenario_pages_status_idx on scenario_pages (status, sort_order);
alter table scenario_pages enable row level security;
