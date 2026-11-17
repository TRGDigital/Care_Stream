-- Staff incentives: email log (so nobody gets the same email twice) and the optional monthly budget.
create table if not exists public.incentive_notifications (
  id text primary key default gen_random_uuid()::text,
  tenant_id text not null, campaign_id text not null, user_id text not null,
  kind text not null, ref text not null default '',
  sent_at timestamptz not null default now()
);
create unique index if not exists incentive_notifications_unique on public.incentive_notifications (campaign_id, user_id, kind, ref);
create index if not exists incentive_notifications_user_idx on public.incentive_notifications (campaign_id, user_id, kind, sent_at desc);

create table if not exists public.incentive_settings (
  tenant_id text primary key,
  monthly_budget_pence integer,
  updated_at timestamptz not null default now()
);

alter table public.incentive_notifications enable row level security;
alter table public.incentive_settings enable row level security;
