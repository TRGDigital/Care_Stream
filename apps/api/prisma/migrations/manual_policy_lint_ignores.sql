-- Per-finding "ignore" for the out-of-date (lint) section.
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code
-- deploy that uses this table. Idempotent: safe to re-run.
--
-- Distinct from policy_review_resolutions ("mark as updated"), which is whole-policy
-- and deliberately LAPSES when the content changes or the review interval passes.
-- An ignore says "this check is wrong about this document", so it must NOT lapse —
-- it stands until a human removes it.
--
-- policy_id uses the sentinel '*' for a tenant-wide ignore rather than NULL, because
-- Postgres treats NULLs as distinct in a UNIQUE constraint and would happily store
-- the same tenant-wide ignore many times over.

BEGIN;

CREATE TABLE IF NOT EXISTS policy_lint_ignores (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT        NOT NULL,
  policy_id   TEXT        NOT NULL,   -- a policy id, or '*' for every policy in the tenant
  signal_key  TEXT        NOT NULL,   -- e.g. 'missing-purpose-scope'
  note        TEXT,
  ignored_by  TEXT,
  ignored_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One ignore per (tenant, policy, signal). Re-ignoring is an upsert, not a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS policy_lint_ignores_unique
  ON policy_lint_ignores (tenant_id, policy_id, signal_key);

-- Every read is "all ignores for this tenant", resolved in memory against the
-- cached findings, so one tenant-scoped index is all this needs.
CREATE INDEX IF NOT EXISTS policy_lint_ignores_tenant_idx
  ON policy_lint_ignores (tenant_id);

COMMENT ON TABLE policy_lint_ignores IS
  'Findings a tenant has judged wrong for a policy. Survives re-scans and content changes; cleared only by un-ignoring.';
COMMENT ON COLUMN policy_lint_ignores.policy_id IS
  'Policy id, or the sentinel ''*'' meaning every policy in this tenant.';

COMMIT;
