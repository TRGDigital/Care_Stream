-- Shared tablet login with "who's using it?" PINs. NEW tables plus two NEW nullable/defaulted columns; nothing existing is changed or dropped.
-- Safe to run more than once. Until it is run, tablet routes answer "not set up yet" and nothing else is affected.
-- RUN THIS BEFORE DEPLOYING the code: the Prisma user and query models read these two columns.

alter table public.users   add column if not exists is_shared boolean not null default false;   -- a shared tablet's own user row (is_active is false so it is excluded from staff counts and lists)
alter table public.queries add column if not exists shared_device_id text;                        -- which tablet a chat question was asked on

-- One connect key per account: the secret in the printed "Connect a tablet" QR. It signs nobody in; a staff PIN is still needed.
create table if not exists public.shared_connect_keys (
  tenant_id          text primary key,
  connect_key        text not null,
  rotated_at         timestamptz not null default now(),
  reminded_at        timestamptz,
  fail_count         int not null default 0,
  fail_window_start  timestamptz,
  blocked_until      timestamptz
);

-- A shared tablet. user_id is the tablet's own user row.
create table if not exists public.shared_devices (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null,
  user_id       text not null,
  name          text not null,
  location      text,
  created_by    text,
  created_at    timestamptz not null default now(),
  paired_at     timestamptz,
  paired_by     text,
  last_seen_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists shared_devices_tenant_idx on public.shared_devices (tenant_id);
create unique index if not exists shared_devices_user_idx on public.shared_devices (user_id);

-- Each staff member's tablet PIN: random, emailed to them, stored encrypted so "Re-send PIN" can send the same one.
create table if not exists public.staff_pins (
  user_id       text primary key,
  tenant_id     text not null,
  pin_enc       text not null,
  set_at        timestamptz not null default now(),
  sent_at       timestamptz,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  last_ok_at    timestamptz,
  resend_window_start timestamptz,
  resend_count  int not null default 0
);
create index if not exists staff_pins_tenant_idx on public.staff_pins (tenant_id);

-- Who used a tablet and when (attribution and audit).
create table if not exists public.shared_sessions (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null,
  device_id   text not null,
  user_id     text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  end_reason  text
);
create index if not exists shared_sessions_device_idx on public.shared_sessions (device_id, started_at);

-- Row level security on with no policy for anon, so only the API can read or write.
alter table public.shared_connect_keys enable row level security;
alter table public.shared_devices enable row level security;
alter table public.staff_pins enable row level security;
alter table public.shared_sessions enable row level security;
