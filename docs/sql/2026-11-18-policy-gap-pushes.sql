-- Missing policies pushed to a client's /policies page from the platform "Missing against our policy catalogue" check.
-- One row per client. items = [{slug,title,description,price_pence}], dismissed = slugs the client has hidden.
create table if not exists policy_gap_pushes (
  tenant_id text primary key,
  pushed_at timestamptz not null default now(),
  pushed_by text,
  items     jsonb not null default '[]'::jsonb,
  dismissed text[] not null default '{}'
);
alter table policy_gap_pushes enable row level security;
