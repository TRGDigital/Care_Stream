-- Website AI chat (public marketing site). Additive only.
-- RLS is enabled with NO policies: these tables are read and written by the API with the service
-- role only. Nothing in the browser talks to them directly.

create table if not exists website_chat_conversations (
  id              text primary key default gen_random_uuid()::text,
  visitor_id      text not null,
  status          text not null default 'ai',
  wants_human     boolean not null default false,
  started_path    text,
  last_path       text,
  visitor_name    text,
  visitor_email   text,
  lead_id         text,
  message_count   integer not null default 0,
  unanswered      integer not null default 0,
  thumbs_up       integer not null default 0,
  thumbs_down     integer not null default 0,
  user_agent      text,
  agent_joined_at timestamp(3),
  last_message_at timestamp(3) not null default current_timestamp,
  created_at      timestamp(3) not null default current_timestamp
);
create index if not exists website_chat_conversations_last_message_at_idx on website_chat_conversations (last_message_at);
create index if not exists website_chat_conversations_visitor_id_idx on website_chat_conversations (visitor_id);

create table if not exists website_chat_messages (
  id              text primary key default gen_random_uuid()::text,
  conversation_id text not null references website_chat_conversations(id) on delete cascade on update cascade,
  role            text not null,
  content         text not null,
  sources         jsonb not null default '[]',
  grounded        boolean,
  feedback        integer,
  path            text,
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,
  created_at      timestamp(3) not null default current_timestamp
);
create index if not exists website_chat_messages_conversation_id_created_at_idx on website_chat_messages (conversation_id, created_at);
create index if not exists website_chat_messages_created_at_idx on website_chat_messages (created_at);

create table if not exists website_chat_pages (
  id           text primary key default gen_random_uuid()::text,
  path         text not null unique,
  title        text,
  section      text,
  content_hash text,
  chunk_count  integer not null default 0,
  status       text not null default 'pending',
  error        text,
  queued_at    timestamp(3),
  indexed_at   timestamp(3),
  updated_at   timestamp(3) not null default current_timestamp
);
create index if not exists website_chat_pages_status_idx on website_chat_pages (status);

create table if not exists website_chat_settings (
  id                 text primary key default 'default',
  enabled            boolean not null default true,
  assistant_name     text not null default 'CareStream AI',
  avatar_url         text,
  greeting           text not null default 'Hi, I''m the CareStream assistant. Ask me anything about policies, training, CQC readiness or pricing, and I''ll answer from what''s on our site.',
  suggested          jsonb not null default '[]',
  agent_name         text not null default 'Len',
  agent_online_until timestamp(3),
  updated_at         timestamp(3) not null default current_timestamp
);

alter table website_chat_conversations enable row level security;
alter table website_chat_messages      enable row level security;
alter table website_chat_pages         enable row level security;
alter table website_chat_settings      enable row level security;
