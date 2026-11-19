-- What admins searched for in the admin search box and did not find. Read in SQL to decide what to rename or build.
create table if not exists admin_search_misses (
  id         bigserial primary key,
  tenant_id  text not null,
  user_id    text,
  tier       text,
  query      text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_search_misses_created_idx on admin_search_misses (created_at desc);
alter table admin_search_misses enable row level security;
