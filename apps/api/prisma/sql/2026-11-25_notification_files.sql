-- Documents attached to admin notifications. NEW table only; nothing existing is changed. Safe to run more than once.
-- A file is uploaded first as a DRAFT (notification_id null) and is attached when the notification is sent, so a notification is never sent with a missing file.
-- Files are kept in private storage (storage_key); they are never at a public address. Only the people the notification was sent to, and the administrators
-- of the account, can download them, through the API. scan_status: clean | skipped (no scanner configured). RLS is on with no policy for anon.
create table if not exists public.staff_notification_files (
  id               text primary key default gen_random_uuid()::text,
  notification_id  text,
  tenant_id        text not null,
  name             text not null,
  mime             text not null,
  size_bytes       integer not null default 0,
  storage_key      text not null,
  scan_status      text not null default 'skipped',
  created_by       text not null,
  created_at       timestamptz not null default now()
);
create index if not exists staff_notification_files_notification_idx on public.staff_notification_files (notification_id);
create index if not exists staff_notification_files_draft_idx on public.staff_notification_files (tenant_id, created_by, created_at) where notification_id is null;
alter table public.staff_notification_files enable row level security;
