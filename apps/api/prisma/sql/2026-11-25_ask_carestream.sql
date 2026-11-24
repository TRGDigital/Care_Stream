-- Ask CareStream (pilot: CS-1001, administrators only). NEW tables only; nothing existing is changed. Safe to run more than once.
-- ask_conversations / ask_messages: a person's chats with an agent. Only the person who had the chat sees it. Delete a conversation and its messages go with it.
--   Retention: for later, conversations older than 12 months will be deleted automatically (a scheduled job, not built yet).
-- ask_documents: things saved to the library (an answer, and later letters and newsletters). status: draft | pending | approved | shared. version counts edits.
-- RLS is on with no policy for anon: only the API reads and writes these tables.
create table if not exists public.ask_conversations (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null,
  user_id     text not null,
  agent_id    text not null,
  title       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ask_conversations_user_idx on public.ask_conversations (tenant_id, user_id, updated_at desc);

create table if not exists public.ask_messages (
  id               text primary key default gen_random_uuid()::text,
  conversation_id  text not null,
  tenant_id        text not null,
  role             text not null,                 -- user | assistant | tool
  content          text not null,
  sources          jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists ask_messages_conv_idx on public.ask_messages (conversation_id, created_at);

create table if not exists public.ask_documents (
  id           text primary key default gen_random_uuid()::text,
  tenant_id    text not null,
  type         text not null default 'answer',    -- answer | letter | newsletter | notification | ...
  title        text not null default '',
  body         text not null default '',
  data         jsonb,
  status       text not null default 'draft',     -- draft | pending | approved | shared
  created_by   text not null,
  approved_by  text,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  version      int not null default 1
);
create index if not exists ask_documents_tenant_idx on public.ask_documents (tenant_id, created_by, updated_at desc);

alter table public.ask_conversations enable row level security;
alter table public.ask_messages enable row level security;
alter table public.ask_documents enable row level security;
