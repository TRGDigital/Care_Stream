-- An anonymous count of EVERY public page view, with or without cookie consent. No cookie, no storage on the device, no IP address, no visitor id:
-- one number per day, page, source and device type. The detailed visit tracker (site_visits) stays consent only. NEW table only; safe to run more than once.
-- RLS is on with no policy for anon: only the API writes and reads it.
create table if not exists public.site_page_counts (
  day      date    not null,
  path     text    not null,
  source   text    not null default 'direct',   -- utm_source, else the referring site's host, else direct
  device   text    not null default 'desktop',  -- desktop | mobile | tablet
  views    integer not null default 0,
  primary key (day, path, source, device)
);
create index if not exists site_page_counts_day_idx on public.site_page_counts (day);
alter table public.site_page_counts enable row level security;
