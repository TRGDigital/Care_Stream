-- Letters shared in a staff member's hub ("My letters"). NEW table only; nothing existing is changed. Safe to run more than once.
-- One row per person a letter was shared with. The finished, headed PDF is SNAPSHOTTED into private storage when it is shared (storage_key), so editing the draft or the
-- letterhead later never changes what the person received. Only that person, and the administrators of the account, can read it, through the API. A letter marked
-- "print only" never gets a row here, so a staff member can never see it. withdrawn_at hides a letter from the hub (the record stays for the administrators).
-- RLS is on with no policy for anon: only the API reads and writes this table.
create table if not exists public.staff_letters (
  id                      text primary key default gen_random_uuid()::text,
  tenant_id               text not null,
  document_id             text not null,                        -- the ask_documents row (the letter in the administrators' library)
  user_id                 text not null,                        -- the staff member it was shared with
  title                   text not null,
  filename                text not null default 'letter.pdf',
  storage_key             text not null,                        -- the PDF snapshot, private storage
  size_bytes              integer not null default 0,
  signed                  boolean not null default false,       -- the sender's signature was applied
  sent_by                 text not null,
  sent_by_name            text not null default '',
  notification_id         text,                                 -- the hub notification created with it (so the notification can link to the letter)
  needs_acknowledgement   boolean not null default false,
  shared_at               timestamptz not null default now(),
  read_at                 timestamptz,
  acknowledged_at         timestamptz,
  withdrawn_at            timestamptz,
  withdrawn_by            text
);
create index if not exists staff_letters_user_idx on public.staff_letters (user_id, withdrawn_at);
create index if not exists staff_letters_document_idx on public.staff_letters (document_id);
create index if not exists staff_letters_notification_idx on public.staff_letters (notification_id);
alter table public.staff_letters enable row level security;
