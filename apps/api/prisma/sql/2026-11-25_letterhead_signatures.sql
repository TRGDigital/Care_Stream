-- Formal letterheads and personal signatures for Ask CareStream letters and reports. NEW tables only; nothing existing is changed. Safe to run more than once.
-- tenant_letterhead: one row per account, what prints at the top and bottom of letters, reports and newsletters (PDF and Word): the name the organisation trades under, its legal
--   name and address, contact details, company registration, optional VAT, CQC and ICO numbers, a footer line, and whether the logo sits left or centred. The logo itself is the
--   organisation logo already kept in Settings.
-- user_signatures: one row per person who has added a signature (administrators and managers). The picture is a small PNG kept in private storage (storage_key); this row only says
--   where it is. It is read by the server only when that person signs a document with it, and it is never sent to anyone else.
-- RLS is on with no policy for anon: only the API reads and writes these tables.
create table if not exists public.tenant_letterhead (
  tenant_id               text primary key,
  trading_name            text,
  legal_name              text,
  address_line1           text,
  address_line2           text,
  town                    text,
  county                  text,
  postcode                text,
  phone                   text,
  email                   text,
  website                 text,
  company_number          text,
  registered_in           text not null default 'England and Wales',   -- England and Wales | Scotland | Northern Ireland | Other
  registered_in_other     text,
  registered_office_same  boolean not null default true,
  registered_office       text,
  vat_number              text,
  cqc_provider_id         text,
  cqc_location_id         text,
  ico_number              text,
  footer_line             text,
  logo_align              text not null default 'left',                 -- left | centre
  updated_by              text,
  updated_at              timestamptz not null default now()
);

create table if not exists public.user_signatures (
  user_id      text primary key,
  tenant_id    text not null,
  storage_key  text not null,
  mime         text not null default 'image/png',
  width        int,
  height       int,
  size_bytes   int,
  updated_at   timestamptz not null default now()
);
create index if not exists user_signatures_tenant_idx on public.user_signatures (tenant_id);

alter table public.tenant_letterhead enable row level security;
alter table public.user_signatures enable row level security;
