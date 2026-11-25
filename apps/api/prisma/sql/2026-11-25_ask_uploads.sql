-- Files attached to an Ask CareStream chat (Pay and Finance agents first). NEW table and ONE new column only; nothing existing is changed. Safe to run more than once.
-- ask_uploads holds METADATA ONLY: what the file was called, what kind it looks like, how many rows, which columns it had and what each meant, which sensitive columns
--   were removed, the match status, and when it will be deleted. It never holds the file's content. The cleaned copy (sensitive columns removed) is kept in PRIVATE
--   storage at storage_key and is deleted on expires_at; the original file is never stored at all.
-- status: ready | needs_match (a payroll whose names have not been matched and confirmed) | deleted.
-- match: the administrator's confirmed choices (row number to staff id, or null for left out), the time they confirmed, and counts.
-- ask_settings.upload_retention: chat_end (deleted with the chat, and in any case after a day) | 30d (the default) | keep (until the administrator deletes it).
-- RLS is on with no policy for anon: only the API reads and writes this table.
create table if not exists public.ask_uploads (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  user_id          text not null,
  conversation_id  text not null,
  agent_id         text not null,
  filename         text not null,
  kind             text not null default 'spreadsheet',      -- spreadsheet | document
  doc_kind         text not null default 'other',            -- payroll | invoice | other
  size_bytes       integer not null default 0,
  row_count        integer not null default 0,
  columns          jsonb,                                    -- what each column meant, and the sensitive columns removed (names and reasons only)
  status           text not null default 'ready',
  match            jsonb,
  storage_key      text not null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz,
  deleted_at       timestamptz
);
create index if not exists ask_uploads_chat_idx on public.ask_uploads (tenant_id, user_id, conversation_id) where deleted_at is null;
create index if not exists ask_uploads_expiry_idx on public.ask_uploads (expires_at) where deleted_at is null and expires_at is not null;
alter table public.ask_uploads enable row level security;

alter table public.ask_settings add column if not exists upload_retention text not null default '30d';

-- OPTIONAL, run once: delete files that have passed their date, every hour (the page also tidies a few each time it is used, so this is only a safety net).
-- select cron.schedule('cs-sweep-ask-uploads', '17 * * * *', $$select public.carestream_cron('sweep-ask-uploads')$$);
