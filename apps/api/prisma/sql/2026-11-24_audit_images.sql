-- Pictures for the audit cards on /care-audits (one unique picture per new home care audit, one per theme for the rest).
-- A NEW table only; nothing existing is changed. Safe to run more than once.
create table if not exists public.audit_images (
  key         text primary key,        -- an audit page slug, or "theme:<id>"
  url         text not null,           -- path to the picture on the API, e.g. /public/policy-shop/image/<file>.webp
  alt         text not null,
  created_at  timestamptz not null default now()
);
alter table public.audit_images enable row level security;   -- no policy for anon: only the API reads and writes it
