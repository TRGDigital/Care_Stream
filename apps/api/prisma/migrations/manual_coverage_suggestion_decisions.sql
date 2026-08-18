-- Per-suggestion decisions on the /gaps coverage analysis, so a re-run does not
-- keep proposing something the tenant has already dealt with.
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg. Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS coverage_suggestion_decisions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL,
  reference_key TEXT NOT NULL,
  policy_id     TEXT,
  requirement   TEXT NOT NULL,
  decision      TEXT NOT NULL,          -- 'ignored' | 'new_section'
  section_title TEXT,
  decided_by    TEXT,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One decision per (tenant, regulation, policy, requirement). policy_id is
-- nullable, and NULLs are distinct in a plain unique index, so use COALESCE.
CREATE UNIQUE INDEX IF NOT EXISTS coverage_suggestion_decisions_unique
  ON coverage_suggestion_decisions (tenant_id, reference_key, COALESCE(policy_id, ''), requirement);
CREATE INDEX IF NOT EXISTS coverage_suggestion_decisions_lookup
  ON coverage_suggestion_decisions (tenant_id, reference_key);

COMMIT;
