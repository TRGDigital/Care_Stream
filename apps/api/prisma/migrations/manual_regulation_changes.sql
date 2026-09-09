-- What actually changed on a source page, and who it affects.
--
-- The monitor could previously only say "this page's fingerprint differs from last week",
-- which is not something anyone can act on. To say WHAT changed you have to have kept the
-- previous text, so regulation_source_checks now carries it.
--
-- One row per detected change. The diff is stored rather than both full documents: the
-- question is always "what is different", and keeping two copies of every page for every
-- change would grow without limit for no added answer.

alter table regulation_source_checks
  add column if not exists content text;

create table if not exists regulation_changes (
  id             text primary key default gen_random_uuid()::text,
  reference_key  text not null,
  official_name  text not null default '',
  url            text not null,
  detected_at    timestamptz not null default now(),

  -- The diff, capped. Enough for a person to judge the change and for the model to summarise
  -- it, without storing whole documents on every edit.
  added_text     text not null default '',
  removed_text   text not null default '',

  -- The AI review. Null until it has run, so a change is visible immediately and explained
  -- shortly after — a detection that waits for a model to be available is a detection lost.
  summary        text not null default '',
  affects_policies boolean,
  impact_note    text not null default '',
  severity       text not null default '',      -- 'material' | 'minor' | 'cosmetic'
  reviewed_at    timestamptz,

  -- Who it lands on, resolved at detection time from regulation_coverage. Snapshotted rather
  -- than joined live: coverage is re-analysed and would otherwise rewrite history.
  impacted       jsonb not null default '[]'::jsonb,

  -- 'new' -> platform team has not looked | 'dismissed' -> not a real change
  -- 'notified' -> tenants have been told
  status         text not null default 'new',
  notified_at    timestamptz,
  notified_count integer not null default 0
);

create index if not exists regulation_changes_status_idx   on regulation_changes (status, detected_at desc);
create index if not exists regulation_changes_ref_idx      on regulation_changes (reference_key, detected_at desc);

-- Platform-operations table: no tenant reads it. RLS on with no policy denies by default.
alter table regulation_changes enable row level security;
