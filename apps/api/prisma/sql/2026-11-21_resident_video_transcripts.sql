-- "This is me" video messages: what is said, for the manager's approval. Adds to 2026-11-21_resident_videos.sql.
-- resident_video_transcripts: one row per video (video_id is unique). After a family video is ready, the API starts a speech to text job
--   (Amazon Transcribe, London). When the manager's screen next asks, the API saves the words and, if they are not English, an English
--   translation (Amazon Translate, London), then deletes the job so the cloud service keeps nothing.
--   state: pending | ready | no_speech | failed | not_available (access to the speech service is not switched on).
--   Machine generated and labelled so. Only managers see it, unless a manager sets show_to_staff for one video, in which case staff see the
--   English text (edited_translation_text if a manager corrected it, else translation_text) under that video only while it is approved.
--   Never used by the assistant, search or anything else. Deleted with the video in every case (reject, delete, profile deletion, status
--   change for pending clips).
-- Safe to run more than once.

create table if not exists public.resident_video_transcripts (
  id                       text primary key default gen_random_uuid()::text,
  tenant_id                text not null,
  resident_id              text not null,
  video_id                 text not null unique,
  state                    text not null default 'pending',   -- pending | ready | no_speech | failed | not_available
  language_code            text,                               -- as detected, for example hi-IN
  language_name            text,                               -- plain name, for example Hindi
  original_text            text,
  translation_text         text,                               -- machine English translation (null when the speech was English or could not be translated)
  edited_translation_text  text,                               -- the manager's corrected English text
  edited_by                text,
  show_to_staff            boolean not null default false,
  job_name                 text,                               -- the running speech job (null once finished and deleted)
  error                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists resident_video_transcripts_resident_idx on public.resident_video_transcripts (resident_id);
create index if not exists resident_video_transcripts_tenant_idx on public.resident_video_transcripts (tenant_id);

-- Same as the other resident tables: row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.resident_video_transcripts enable row level security;
