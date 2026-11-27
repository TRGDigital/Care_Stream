-- Which sentences of a detected regulation change matter to care providers' policies (the rest are shown as not relevant).
-- NEW table only; nothing existing is changed. Safe to run more than once. RLS on with no policy for anon: only the API reads and writes it.
create table if not exists public.regulation_change_reviews (
  change_id         text primary key,
  relevant_added    jsonb not null default '[]'::jsonb,
  relevant_removed  jsonb not null default '[]'::jsonb,
  ignored_note      text not null default '',
  created_at        timestamptz not null default now()
);
alter table public.regulation_change_reviews enable row level security;
