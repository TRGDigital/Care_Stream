-- "This is me" resident photos (Professional and Enterprise plans). Adds to 2026-11-17_resident_profiles.sql.
-- resident_photos: one row per photo. Photos come from a family invite link (pending until a manager approves) or from a manager
--   (approved at once). The image itself lives in private storage (s3_key), never at a public address, and is re-encoded on upload so
--   camera location data is gone. Staff and the hub only ever see APPROVED photos of LIVING residents. A rejected photo has its file
--   removed from storage straight away (s3_key set to ''). The rest are deleted with the profile, at the end of the retention period.
-- Photos are never part of the assistant's knowledge: nothing here is read by the knowledge sync.
-- Safe to run more than once.

create table if not exists public.resident_photos (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null,
  resident_id       text not null,
  invite_id         text,                                -- the family link it came through (null when a manager added it)
  uploaded_by_name  text not null,
  relationship      text,
  source            text not null default 'family',      -- family | manager
  caption           text,                                -- plain text, up to 140 characters
  people_note       text,                                -- who is in the photo, plain text
  s3_key            text not null,
  mime              text not null default 'image/jpeg',
  size_bytes        integer not null default 0,
  width             integer,
  height            integer,
  status            text not null default 'pending',     -- pending | approved | rejected
  scan_status       text not null default 'skipped',     -- clean | skipped
  submitted_at      timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        text
);
create index if not exists resident_photos_resident_idx on public.resident_photos (resident_id, status);
create index if not exists resident_photos_invite_idx on public.resident_photos (invite_id);
create index if not exists resident_photos_tenant_idx on public.resident_photos (tenant_id);

-- Same as the other resident tables: row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.resident_photos enable row level security;
