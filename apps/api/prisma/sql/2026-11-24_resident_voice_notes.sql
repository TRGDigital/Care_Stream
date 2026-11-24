-- "This is me" family VOICE NOTES (Professional and Enterprise plans, same as video messages).
-- A voice note is a video message with no picture: it uses the same table, the same chunked upload, private storage, manager approval,
-- play log and speech to text. This only adds one column saying which kind a row is. Existing rows are all videos.
-- A voice note keeps poster_key = '' and width and height empty; it is stored as AAC audio (audio/mp4, .m4a), at most two minutes.
-- Safe to run more than once. Nothing is changed or removed.
alter table public.resident_videos add column if not exists media_kind text not null default 'video';   -- video | audio
create index if not exists resident_videos_kind_idx on public.resident_videos (resident_id, media_kind);
