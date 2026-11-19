-- Super User: one champion per company (see ~/carestream-content/specs/super-user-spec.md). Additive. Safe to run before the deploy.
alter table users add column if not exists super_user_since timestamptz;
alter table users add column if not exists super_user_consent_at timestamptz;
-- exactly one Super User per company
create unique index if not exists users_one_super_user_per_tenant on users (tenant_id) where super_user_since is not null;

alter table audit_runs add column if not exists completed_by_user_id text;

create table if not exists super_user_vouchers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null unique,
  user_id     text not null,
  status      text not null default 'due',
  eligible_at timestamptz not null default now(),
  sent_at     timestamptz,
  sent_by     text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table super_user_vouchers enable row level security;

create table if not exists user_active_seconds (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  text not null,
  user_id    text not null,
  day        date not null,
  seconds    integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists user_active_seconds_tenant_day on user_active_seconds (tenant_id, day);
alter table user_active_seconds enable row level security;
