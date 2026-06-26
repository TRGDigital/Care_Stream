-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-26.
-- Decision-maker enrichment for provider_leads: a contact email scraped from the
-- provider's own website, plus a named director from Companies House. Generated
-- on demand by services/prospects/enrich.ts.

ALTER TABLE public.provider_leads
  ADD COLUMN IF NOT EXISTS contact_name       text,
  ADD COLUMN IF NOT EXISTS contact_role       text,
  ADD COLUMN IF NOT EXISTS enriched_email     text,
  ADD COLUMN IF NOT EXISTS enrichment_source  text,   -- website | companies-house | website+companies-house | none
  ADD COLUMN IF NOT EXISTS company_number     text,
  ADD COLUMN IF NOT EXISTS enriched_at        timestamptz;
