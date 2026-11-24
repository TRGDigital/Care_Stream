-- Ask CareStream actions: the agent PROPOSES (a card in the panel) and only a person pressing Confirm makes anything happen. NEW tables only; nothing existing is changed.
-- Safe to run more than once. RLS is on with no policy for anon: only the API reads and writes these tables.
-- ask_actions: one proposal. status proposed | confirmed | cancelled | expired | failed | done. payload is what will be done (recipients, message, due date); result is what happened.
--   A proposal expires after 30 minutes and can be confirmed once.
-- ask_settings: one row per account: the guardrail switches (all OFF by default), the largest number of people one action may reach, the minimum gap between actions for one
--   administrator, and whether deciding managers may use Ask CareStream.
-- notification_withdrawals: a sent staff notification that was withdrawn (its recipients were removed from staff hubs). The email cannot be recalled.
create table if not exists public.ask_actions (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  user_id          text not null,
  conversation_id  text,
  message_id       text,
  type             text not null,
  payload          jsonb not null default '{}'::jsonb,
  status           text not null default 'proposed',
  result           jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  confirmed_at     timestamptz,
  confirmed_by     text
);
create index if not exists ask_actions_user_idx on public.ask_actions (tenant_id, user_id, created_at desc);
create index if not exists ask_actions_conv_idx on public.ask_actions (conversation_id);

create table if not exists public.ask_settings (
  tenant_id              text primary key,
  actions_enabled        boolean not null default false,
  notifications_enabled  boolean not null default false,
  training_enabled       boolean not null default false,
  emails_enabled         boolean not null default false,
  max_recipients         int not null default 100,
  min_gap_minutes        int not null default 2,
  managers_can_use       boolean not null default false,
  updated_at             timestamptz not null default now()
);

create table if not exists public.notification_withdrawals (
  notification_id  text primary key,
  tenant_id        text not null,
  withdrawn_by     text not null,
  withdrawn_at     timestamptz not null default now(),
  recipients       int not null default 0,
  read_count       int not null default 0
);
create index if not exists notification_withdrawals_tenant_idx on public.notification_withdrawals (tenant_id);

alter table public.ask_actions enable row level security;
alter table public.ask_settings enable row level security;
alter table public.notification_withdrawals enable row level security;
