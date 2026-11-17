-- "This is me" resident profiles (Professional and Enterprise plans).
-- residents: one profile per resident (what makes them who they are, not clinical records). Only living residents reach the hub
--   and the assistant; when someone dies or moves on the profile is archived, kept for the retention period (7 years by default)
--   and then deleted by an admin with the resident archive permission.
-- resident_invites: a private link emailed to a friend or family member (only a hash of the token is stored).
-- resident_contributions: what a family member wrote, one row per answer. Nothing reaches staff until an admin approves it.
-- Safe to run more than once.

create table if not exists public.residents (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  first_name       text not null,
  last_name        text not null,
  preferred_name   text,
  dob              date,
  room             text,
  status           text not null default 'living',      -- living | left | deceased
  status_at        date,                                -- date they died or moved on
  status_note      text,
  sections         jsonb not null default '{}'::jsonb,  -- approved profile text, keyed by section
  entry_ids        jsonb not null default '[]'::jsonb,  -- knowledge_entries created from this profile (so archiving can remove them)
  archive          jsonb,                               -- archive task state (confirmed by, memory book, family contacts removed, assignees)
  archived_at      timestamptz,
  retention_until  date,
  retention_notified_at timestamptz,                    -- last retention reminder sent to the archive admins
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists residents_tenant_idx on public.residents (tenant_id, status);

create table if not exists public.resident_invites (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null,
  resident_id   text not null,
  email         text not null,
  name          text not null,
  relationship  text not null,
  token_hash    text not null,
  sent_at       timestamptz not null default now(),
  expires_at    timestamptz not null,
  opened_at     timestamptz,
  submitted_at  timestamptz,
  revoked_at    timestamptz,
  created_by    text
);
create unique index if not exists resident_invites_token_idx on public.resident_invites (token_hash);
create index if not exists resident_invites_resident_idx on public.resident_invites (resident_id);

create table if not exists public.resident_contributions (
  id               text primary key default gen_random_uuid()::text,
  tenant_id        text not null,
  resident_id      text not null,
  invite_id        text not null,
  contributor_name text not null,
  relationship     text not null,
  section_key      text not null,
  text             text not null,
  status           text not null default 'pending',     -- pending | approved | rejected
  submitted_at     timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       text,
  approved_text    text
);
create index if not exists resident_contributions_resident_idx on public.resident_contributions (resident_id, status);

alter table public.residents enable row level security;
alter table public.resident_invites enable row level security;
alter table public.resident_contributions enable row level security;

-- Optional, run once: daily reminder to the archive admins when a retention date is near or passed (same helper as the other jobs).
-- select cron.unschedule('cs-resident-retention') where exists (select 1 from cron.job where jobname = 'cs-resident-retention');
-- select cron.schedule('cs-resident-retention', '15 9 * * *', $$select public.carestream_cron('resident-retention')$$);
