-- First-party site activity for carestreamai.com: one row per page view, updated by a 30 second heartbeat and on leave.
-- Only visitors who accepted analytics cookies are recorded. No IP address, no name, no email: an anonymous visitor id, a session id,
-- the path, active seconds, scroll depth, what was clicked (labels) and which conversions happened (email entered, sign up clicked, demo clicked...).
-- Additive. Safe to run before the deploy.
create table if not exists site_visits (
  id              uuid primary key,
  visitor_id      text,
  session_id      text,
  path            text not null,
  page_type       text,
  referrer        text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  device          text,
  is_return       boolean not null default false,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  active_seconds  integer not null default 0,
  elapsed_seconds integer not null default 0,
  max_scroll_pct  integer not null default 0,
  interactions    integer not null default 0,
  clicks          jsonb,
  conversions     text[] not null default '{}',
  next_path       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists site_visits_started_idx on site_visits (started_at desc);
create index if not exists site_visits_visitor_idx on site_visits (visitor_id, started_at desc);
create index if not exists site_visits_path_idx on site_visits (path, started_at desc);
alter table site_visits enable row level security;
