-- Staff incentives (Professional and Enterprise plans).
-- incentive_campaigns: a monthly campaign (draft -> awaiting_approval -> live -> ended). A care manager approves it before it goes live.
-- incentive_rules: what earns points (training completed, on time, CPD, onboarding, practical sign-off), with an optional cap per person.
-- incentive_rewards: what a points target unlocks (free text, optional image, optional limited quantity, optional money value).
-- incentive_participants: chosen staff and/or per person target overrides (keyed by reward key).
-- incentive_ledger: append only record of points, one row per campaign, rule, person and source event (so nothing is awarded twice).
-- incentive_claims: who reached which reward, in what order (earliest completion time first), and the manager approval and handover.
-- CareStream only records and reports. It never buys vouchers or moves money. Safe to run more than once.

create table if not exists public.incentive_campaigns (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null,
  name              text not null,
  month             text not null,                       -- YYYY-MM
  period_start      timestamptz not null,
  period_end        timestamptz not null,
  everyone          boolean not null default true,       -- true = every current staff member (not agency); false = only the participants
  status            text not null default 'draft',       -- draft | awaiting_approval | live | ended | rejected | cancelled
  created_by        text,
  created_by_name   text,
  submitted_at      timestamptz,
  approved_by       text,
  approved_by_name  text,
  approved_at       timestamptz,
  rejected_reason   text,
  last_evaluated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists incentive_campaigns_tenant_idx on public.incentive_campaigns (tenant_id, month desc);

create table if not exists public.incentive_rules (
  id             text primary key default gen_random_uuid()::text,
  tenant_id      text not null,
  campaign_id    text not null,
  event          text not null,
  points         integer not null,
  max_per_month  integer
);
create index if not exists incentive_rules_campaign_idx on public.incentive_rules (campaign_id);

create table if not exists public.incentive_rewards (
  id             text primary key default gen_random_uuid()::text,
  tenant_id      text not null,
  campaign_id    text not null,
  key            text not null,
  title          text not null,
  image_data     text,
  target_points  integer not null,
  quantity       integer,                                -- null = everyone who qualifies
  value_pence    integer,
  position       integer not null default 0
);
create index if not exists incentive_rewards_campaign_idx on public.incentive_rewards (campaign_id);

create table if not exists public.incentive_participants (
  id           text primary key default gen_random_uuid()::text,
  tenant_id    text not null,
  campaign_id  text not null,
  user_id      text not null,
  targets      jsonb not null default '{}'::jsonb
);
create unique index if not exists incentive_participants_unique on public.incentive_participants (campaign_id, user_id);

create table if not exists public.incentive_ledger (
  id           text primary key default gen_random_uuid()::text,
  tenant_id    text not null,
  campaign_id  text not null,
  user_id      text not null,
  rule_id      text not null,
  event        text not null,
  source_id    text not null,
  label        text not null,
  points       integer not null,
  occurred_at  timestamptz not null,
  created_at   timestamptz not null default now()
);
create unique index if not exists incentive_ledger_unique on public.incentive_ledger (campaign_id, rule_id, user_id, source_id);
create index if not exists incentive_ledger_user_idx on public.incentive_ledger (tenant_id, user_id, occurred_at desc);

create table if not exists public.incentive_claims (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  campaign_id      text not null,
  reward_id        text not null,
  user_id          text not null,
  reached_at       timestamptz not null,
  status           text not null default 'held',        -- held | approved | given | missed | rejected | forfeited
  rank             integer,
  tied             boolean not null default false,
  decided_by       text,
  decided_by_name  text,
  decided_at       timestamptz,
  reject_reason    text,
  given_by         text,
  given_by_name    text,
  given_at         timestamptz,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists incentive_claims_unique on public.incentive_claims (reward_id, user_id);
create index if not exists incentive_claims_campaign_idx on public.incentive_claims (campaign_id, status);

alter table public.incentive_campaigns enable row level security;
alter table public.incentive_rules enable row level security;
alter table public.incentive_rewards enable row level security;
alter table public.incentive_participants enable row level security;
alter table public.incentive_ledger enable row level security;
alter table public.incentive_claims enable row level security;

-- Optional, run once after this: evaluate live campaigns every 30 minutes so claims form even if nobody opens the page.
-- select cron.unschedule('cs-incentives') where exists (select 1 from cron.job where jobname = 'cs-incentives');
-- select cron.schedule('cs-incentives', '*/30 * * * *', $$select public.carestream_cron('incentives')$$);
