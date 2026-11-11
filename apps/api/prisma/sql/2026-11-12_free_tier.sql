-- Free tier foundation (ships DARK: nothing here changes an existing tenant).
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code deploy.
-- Idempotent: safe to re-run. All additions are nullable or defaulted.
--
-- Design: docs/free-tier/DESIGN.md (branch free-tier-design).

BEGIN;

-- 1. Plans: the one thing audits do not include on the Free plan is the AI recommendations.
--    Defaults to true so every existing plan keeps them.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS has_audit_recommendations BOOLEAN NOT NULL DEFAULT true;

-- 2. Tenants: lifetime policy creation counter (NULL limit = unlimited, which is every
--    existing tenant), the lifetime AI budget for gap analysis, and when the free period began
--    (a tenant that downgrades after cancelling starts a new free period).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS policies_created_lifetime INT NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS policies_lifetime_limit  INT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS free_ai_budget_usd       NUMERIC(8,2);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS free_since               TIMESTAMPTZ;

-- Informational backfill only: the limit stays NULL so no existing tenant is restricted.
UPDATE tenants t
   SET policies_created_lifetime = c.n
  FROM (SELECT tenant_id, count(*)::int AS n FROM policies WHERE status <> 'archived' GROUP BY tenant_id) c
 WHERE c.tenant_id = t.id AND t.policies_created_lifetime = 0;

-- 3. Ledger of policies counted against the lifetime allowance. No foreign key to policies, so
--    deleting a policy can never erase the fact that it was counted.
CREATE TABLE IF NOT EXISTS policy_creation_ledger (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT        NOT NULL,
  content_hash TEXT        NOT NULL,
  policy_id    TEXT,
  policy_name  TEXT,
  source       TEXT        NOT NULL DEFAULT 'upload',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS policy_creation_ledger_unique ON policy_creation_ledger (tenant_id, content_hash);
CREATE INDEX IF NOT EXISTS policy_creation_ledger_policy_idx ON policy_creation_ledger (tenant_id, policy_id);
ALTER TABLE policy_creation_ledger ENABLE ROW LEVEL SECURITY;

-- 4. Small per-tenant counters: gap drill-in taster, monthly forced re-runs.
CREATE TABLE IF NOT EXISTS free_usage_counters (
  tenant_id TEXT NOT NULL,
  key       TEXT NOT NULL,
  period    TEXT NOT NULL DEFAULT '',
  n         INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, key, period)
);
ALTER TABLE free_usage_counters ENABLE ROW LEVEL SECURITY;

-- 5. Signup attempts, for the free signup limits (hashed IP, never the raw address).
CREATE TABLE IF NOT EXISTS signup_attempts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_hash      TEXT,
  email_domain TEXT,
  outcome      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signup_attempts_ip_idx ON signup_attempts (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS signup_attempts_domain_idx ON signup_attempts (email_domain, created_at);
ALTER TABLE signup_attempts ENABLE ROW LEVEL SECURITY;

-- 6. The Free plan. is_public = false keeps it out of the /billing/plans chooser (Stripe cannot
--    price a 0 plan). Limits per DESIGN.md section 1.
INSERT INTO plans (id, name, monthly_query_limit, max_policies, max_staff_users, max_handbooks,
                   max_manual_knowledge_entries, has_advanced_analytics, has_cqc_report, has_gap_detection,
                   has_face_to_face, has_custom_audits, has_effectiveness, has_training_impact,
                   has_workforce_compliance, monthly_ai_token_limit, monthly_annual_license_limit,
                   price_monthly_pence, is_active, is_public, has_audit_recommendations)
SELECT gen_random_uuid()::text, 'Free', 0, 5, NULL, 0,
       0, false, false, true,
       false, false, false, false,
       false, 3000000, 0,
       0, true, false, false
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Free');

COMMIT;

-- Check afterwards:
--   SELECT name, price_monthly_pence, is_public, has_audit_recommendations FROM plans ORDER BY price_monthly_pence;
--   SELECT count(*) FROM tenants WHERE policies_lifetime_limit IS NOT NULL;   -- expect 0
