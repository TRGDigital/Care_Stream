-- Hub overlay notices. When an admin allocates something to a staff member, the hub shows an overlay the next time it opens,
-- with the admin's picture, name and role, the headline, the details and one button (the same words as the email).
-- A NEW table on purpose: nothing is added to the users table. Until it is run, no overlays show and nothing else is affected.
-- Safe to run more than once. The owner runs this.

create table if not exists public.staff_notices (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null,
  user_id       text not null,                 -- the person who sees the overlay
  actor_user_id text,                          -- the admin who allocated it
  kind          text not null,
  headline      text not null,
  intro         text,
  details       jsonb not null default '[]'::jsonb,   -- array of { label, value }
  button_label  text,
  href          text,                          -- relative hub path, for example /chat?view=training
  created_at    timestamptz not null default now(),
  seen_at       timestamptz
);
create index if not exists staff_notices_user_seen_idx on public.staff_notices (user_id, seen_at);
create index if not exists staff_notices_tenant_idx on public.staff_notices (tenant_id);

-- Row level security on, no policy for anon, so only the API (service role) can read or write.
alter table public.staff_notices enable row level security;
