-- Staff profile pictures. One row per staff member who has a picture (user_id is unique, so replacing overwrites).
-- The image itself lives in private storage (tenants/{tenant}/staff/{user}/photo.jpg), 512x512 JPEG, re-encoded on upload so
-- camera location data is gone. It is never given a public address: the API serves it through a short-lived signed link.
-- This is a NEW table on purpose: nothing is added to the users table, so running this late cannot affect sign in.
-- Until it is run, the feature simply shows initials and uploads answer "being set up".
-- Safe to run more than once.

create table if not exists public.staff_photos (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null,
  user_id     text not null unique,
  s3_key      text not null,
  mime        text not null default 'image/jpeg',
  size_bytes  integer not null default 0,
  width       integer,
  height      integer,
  uploaded_by text not null,                          -- the user id of whoever set it (the person themselves or an admin)
  updated_at  timestamptz not null default now()
);
create index if not exists staff_photos_tenant_idx on public.staff_photos (tenant_id);

-- Row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.staff_photos enable row level security;
