-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-26.
-- Platform-level table (no tenant_id), accessed only via the API (postgres role,
-- which bypasses RLS). RLS enabled with no anon/authenticated policies so the
-- PostgREST/anon path is denied by default — defence in depth.
--
-- Outbound prospecting universe for the "Prospects" tab. Each row is a UK CQC-
-- regulated care provider, snapshotted from the CareAssura `care_homes` table by
-- the sync service, with a computed CareStream lead segment/score/angle plus
-- writable nurture state (status, owner, notes, contact dates).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.provider_leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             text NOT NULL,                       -- CareAssura care_homes.id (upsert key)
  slug                  text,
  -- ── Provider snapshot ──
  name                  text NOT NULL,
  setting               text,                                -- Residential | Nursing | Home care
  town                  text,
  county                text,
  region                text,
  postcode              text,
  phone                 text,
  email                 text,
  website               text,
  -- ── CQC signal ──
  cqc_rating            text,                                -- inadequate | requires_improvement | good | outstanding | not_rated
  cqc_safe_rating       text,
  cqc_effective_rating  text,
  cqc_caring_rating     text,
  cqc_responsive_rating text,
  cqc_well_led_rating   text,
  cqc_inspection_date   date,
  cqc_report_url        text,
  -- ── Computed by the scoring engine (refreshed every sync) ──
  segment               text NOT NULL DEFAULT 'unrated',     -- rescue | protect | maintain | defend | unrated
  score                 integer NOT NULL DEFAULT 0,
  lead_angle_key        text,                                -- well_led | safe | effective | responsive | caring | maintain | defend | unrated
  lead_angle_label      text,                                -- human label, e.g. "AI compliance & audit workspace"
  failing_domains       text[] NOT NULL DEFAULT '{}',
  why_now               text,
  -- ── Nurture state (writable; preserved across syncs) ──
  status                text NOT NULL DEFAULT 'new',         -- new | queued | contacted | engaged | qualified | won | lost | suppressed
  owner                 text,
  notes                 text,
  last_contacted_at     timestamptz,
  next_action_at        timestamptz,
  -- ── Housekeeping ──
  synced_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_leads_source_id_key ON public.provider_leads (source_id);
CREATE INDEX IF NOT EXISTS provider_leads_segment_score_idx  ON public.provider_leads (segment, score DESC);
CREATE INDEX IF NOT EXISTS provider_leads_status_idx         ON public.provider_leads (status);
CREATE INDEX IF NOT EXISTS provider_leads_region_idx         ON public.provider_leads (region);
CREATE INDEX IF NOT EXISTS provider_leads_setting_idx        ON public.provider_leads (setting);
CREATE INDEX IF NOT EXISTS provider_leads_rating_idx         ON public.provider_leads (cqc_rating);
CREATE INDEX IF NOT EXISTS provider_leads_name_trgm_idx      ON public.provider_leads USING gin (name gin_trgm_ops);

ALTER TABLE public.provider_leads ENABLE ROW LEVEL SECURITY;
