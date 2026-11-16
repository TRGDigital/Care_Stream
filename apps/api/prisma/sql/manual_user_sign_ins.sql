-- Every sign in attempt by a known user: when, from where (IP and rough location), on what device, and how they opened CareStream.
-- Shown on the platform staff profile (Access and devices). Starts when this is deployed; earlier sign ins were not recorded.
create table if not exists public.user_sign_ins (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      text not null,
  user_id        uuid not null,
  at             timestamptz not null default now(),
  success        boolean not null,
  method         text not null,            -- password | magic_link
  failure_reason text,                     -- wrong_password | account_locked | email_not_verified | account_deactivated
  ip             text,
  country        text,
  region         text,
  city           text,
  user_agent     text,
  device         text,                     -- "Chrome on Android"
  client         text not null default 'unknown'  -- web | installed_web | android_app | ios_app | unknown
);
create index if not exists user_sign_ins_user_idx   on public.user_sign_ins (user_id, at desc);
create index if not exists user_sign_ins_tenant_idx on public.user_sign_ins (tenant_id, at desc);
alter table public.user_sign_ins enable row level security;
