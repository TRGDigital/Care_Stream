-- Live support chat (customer help window and the platform inbox). New tables only; nothing existing is changed. Safe to run more than once.
-- support_chats: one conversation per question. mode 'live' = asked while the team was online, 'offline' = left as a message to answer later.
--   status: open (being talked about) | waiting (the customer wrote last and nobody has answered) | answered (an offline message that has had a reply) | closed.
-- support_chat_messages: what each side said. sender customer | agent | system.
-- support_agent_presence: the team member (or members) who have the inbox open and have said they are online. Online means a heartbeat within the last 90 seconds.
-- RLS is on with no policy for anon: only the API reads and writes these tables.

create table if not exists public.support_chats (
  id                        text primary key default gen_random_uuid()::text,
  tenant_id                 text not null,
  user_id                   text not null,
  customer_name             text not null default '',
  customer_email            text not null default '',
  customer_reference        text not null default '',          -- the account number, for example CS-1001
  home_name                 text not null default '',
  plan                      text not null default '',
  status                    text not null default 'waiting',   -- open | waiting | answered | closed
  mode                      text not null default 'live',      -- live | offline
  assigned_to               text,
  last_message_at           timestamptz not null default now(),
  last_customer_message_at  timestamptz,
  last_agent_message_at     timestamptz,
  last_agent_read_at        timestamptz,
  customer_last_read_at     timestamptz,
  notified_at               timestamptz,                       -- last team email for this chat (throttle)
  created_at                timestamptz not null default now(),
  closed_at                 timestamptz
);
create index if not exists support_chats_tenant_idx on public.support_chats (tenant_id, user_id, status);
create index if not exists support_chats_inbox_idx on public.support_chats (status, mode, last_message_at desc);

create table if not exists public.support_chat_messages (
  id           text primary key default gen_random_uuid()::text,
  chat_id      text not null,
  sender       text not null,                                  -- customer | agent | system
  sender_name  text not null default '',
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists support_chat_messages_chat_idx on public.support_chat_messages (chat_id, created_at);

create table if not exists public.support_agent_presence (
  agent_key     text primary key,
  agent_name    text not null default '',
  online        boolean not null default false,
  last_seen_at  timestamptz not null default now()
);

alter table public.support_chats enable row level security;
alter table public.support_chat_messages enable row level security;
alter table public.support_agent_presence enable row level security;
