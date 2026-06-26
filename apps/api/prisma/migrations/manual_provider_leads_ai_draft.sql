-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-26.
-- Adds the AI-sharpened outreach draft to provider_leads. Generated on demand by
-- services/prospects/ai-draft.ts (Claude), opportunistically using the provider's
-- CQC report page text. ai_draft_sources = 'cqc-report' when the page was used,
-- else 'signals'.

ALTER TABLE public.provider_leads
  ADD COLUMN IF NOT EXISTS ai_draft_subject text,
  ADD COLUMN IF NOT EXISTS ai_draft_body    text,
  ADD COLUMN IF NOT EXISTS ai_draft_sources text,
  ADD COLUMN IF NOT EXISTS ai_drafted_at    timestamptz;
