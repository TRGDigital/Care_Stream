-- Admin notifications to staff. An administrator writes a message and sends it to all staff or chosen staff; each person gets an email and, at their next
-- sign in, an overlay in their hub. They open it and press Mark as read, and the administrator sees who has read it.
-- staff_notifications: one row per message. staff_notification_recipients: one row per person it was sent to (email_sent_at null = the email failed).
-- New tables only; nothing existing is changed. Safe to run more than once. RLS is on with no policy for anon: only the API reads and writes these.
create table if not exists public.staff_notifications (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null,
  title             text not null,
  body              text not null,
  created_by        text not null,
  created_by_name   text not null default '',
  audience          text not null default 'all',          -- all | selected
  created_at        timestamptz not null default now(),
  last_reminded_at  timestamptz
);
create index if not exists staff_notifications_tenant_idx on public.staff_notifications (tenant_id, created_at desc);

create table if not exists public.staff_notification_recipients (
  id               text primary key default gen_random_uuid()::text,
  notification_id  text not null,
  tenant_id        text not null,
  user_id          text not null,
  email_sent_at    timestamptz,
  shown_at         timestamptz,                            -- the overlay was first shown to them
  read_at          timestamptz,                            -- they pressed Mark as read
  created_at       timestamptz not null default now(),
  unique (notification_id, user_id)
);
create index if not exists staff_notification_recipients_user_idx on public.staff_notification_recipients (user_id, read_at);
create index if not exists staff_notification_recipients_notification_idx on public.staff_notification_recipients (notification_id);
create index if not exists staff_notification_recipients_tenant_idx on public.staff_notification_recipients (tenant_id, created_at desc);

alter table public.staff_notifications enable row level security;
alter table public.staff_notification_recipients enable row level security;
