-- Training tiers: prebuilt vs CPD-approved (phases 0-2 of the three-tier plan)
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code
-- deploy that uses these columns. Idempotent: safe to re-run.
--
-- IMPORTANT: the licence backfill below is only unambiguous while each topic still
-- has exactly ONE platform module. Run this before any CPD copy is created.

BEGIN;

-- Which shelf a platform module sits on. 'prebuilt' = the standard library;
-- 'cpd' = a deepened copy being taken through (or holding) CPD accreditation.
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'prebuilt';
-- Lineage: which pre-built module a CPD copy came from. Never used for routing.
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS source_module_id TEXT;

-- The EXACT module a licence was bought for. Allocation uses this, never a
-- topic lookup, so a purchase can never land on the wrong tier.
ALTER TABLE training_licenses
  ADD COLUMN IF NOT EXISTS module_id TEXT;

-- The module a topic's public page describes and the shop sells (explicit
-- designation), plus a derived flag for "a CPD copy exists".
ALTER TABLE training_topics
  ADD COLUMN IF NOT EXISTS shop_module_id TEXT;
ALTER TABLE training_topics
  ADD COLUMN IF NOT EXISTS has_cpd_version BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS training_modules_topic_tier_idx
  ON training_modules (topic_id, tier) WHERE tenant_id IS NULL;

-- ── Backfills (single-module world — unambiguous today, ambiguous after the first copy) ──

-- Every licence points at the one platform module its topic has.
UPDATE training_licenses l
SET    module_id = m.id::text
FROM   training_modules m
WHERE  l.module_id IS NULL
  AND  l.topic_id IS NOT NULL
  AND  m.topic_id::text = l.topic_id::text
  AND  m.tenant_id IS NULL
  AND  m.source    = 'ai_generated';

-- Every platform topic's public page describes its one existing module.
UPDATE training_topics t
SET    shop_module_id = m.id::text
FROM   training_modules m
WHERE  t.shop_module_id IS NULL
  AND  t.tenant_id IS NULL
  AND  m.topic_id::text = t.id::text
  AND  m.tenant_id IS NULL
  AND  m.source    = 'ai_generated';

COMMIT;
