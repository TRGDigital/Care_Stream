-- "This is me" family video messages (Professional and Enterprise plans). Adds to 2026-11-17_resident_profiles.sql and 2026-11-20_resident_photos.sql.
-- resident_videos: one row per clip. Clips come from a family invite link (pending until a manager approves) or from a manager (approved
--   at once). A clip is uploaded in 4 MB chunks, then processed by the API (ffmpeg) into an MP4 plus a poster picture, both kept in private
--   storage (s3_key, poster_key), never at a public address. Camera location data and other metadata are stripped by the processing.
--   state: uploading -> processing -> ready (or failed). Staff and the hub only ever see APPROVED, READY clips of LIVING residents.
--   A rejected clip has its files removed from storage straight away (s3_key and poster_key set to ''). The rest are deleted with the
--   profile, at the end of the retention period. Pending clips are deleted when the resident dies or moves on.
-- resident_video_plays: who pressed play on which clip and when, shown to managers on the resident record as evidence of person centred care.
-- Videos are never part of the assistant's knowledge and are never read or described by it: nothing here is read by the knowledge sync.
-- Safe to run more than once.

create table if not exists public.resident_videos (
  id                     text primary key default gen_random_uuid()::text,
  tenant_id              text not null,
  resident_id            text not null,
  invite_id              text,                                -- the family link it came through (null when a manager added it)
  uploaded_by_name       text not null,
  relationship           text,
  source                 text not null default 'family',      -- family | manager
  title                  text,                                -- plain text, up to 60 characters
  note                   text,                                -- optional plain text note written by a manager
  state                  text not null default 'uploading',   -- uploading | processing | ready | failed
  status                 text not null default 'pending',     -- pending | approved | rejected
  s3_key                 text not null default '',            -- processed MP4 (empty until ready, and again once rejected)
  poster_key             text not null default '',            -- poster JPEG
  mime                   text not null default 'video/mp4',
  duration_seconds       double precision,
  size_bytes             integer not null default 0,          -- declared size while uploading, the processed size once ready
  width                  integer,
  height                 integer,
  upload_id              text,
  total_chunks           integer not null default 0,
  scan_status            text not null default 'skipped',     -- clean | skipped
  error                  text,                                -- plain message shown to the sender when state is failed
  submitted_at           timestamptz not null default now(),
  processing_started_at  timestamptz,
  decided_at             timestamptz,
  decided_by             text,
  last_played_at         timestamptz
);
create index if not exists resident_videos_resident_idx on public.resident_videos (resident_id, status);
create index if not exists resident_videos_invite_idx on public.resident_videos (invite_id);
create index if not exists resident_videos_tenant_idx on public.resident_videos (tenant_id);

create table if not exists public.resident_video_plays (
  id           text primary key default gen_random_uuid()::text,
  tenant_id    text not null,
  resident_id  text not null,
  video_id     text not null,
  user_id      text not null,
  played_at    timestamptz not null default now()
);
create index if not exists resident_video_plays_resident_idx on public.resident_video_plays (resident_id, played_at desc);
create index if not exists resident_video_plays_video_idx on public.resident_video_plays (video_id);

-- Same as the other resident tables: row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.resident_videos enable row level security;
alter table public.resident_video_plays enable row level security;
