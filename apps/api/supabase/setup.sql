-- =============================================================================
-- CareStreamAI — Full Database Setup Script
-- Run this in Supabase Dashboard > SQL Editor after prisma db push.
-- Applies: RLS policies, roles, indexes, triggers, and seed data.
-- =============================================================================


-- =============================================================================
-- SECTION 1 — Application Database Role
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'carestreamai_api') THEN
    CREATE ROLE carestreamai_api LOGIN PASSWORD 'CareStreamApi2024!';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO carestreamai_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carestreamai_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carestreamai_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carestreamai_api;


-- =============================================================================
-- SECTION 2 — Tenant Context Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$;


-- =============================================================================
-- SECTION 3 — Enable RLS
-- =============================================================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 4 — RLS Policies
-- =============================================================================

-- ── tenants ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT TO carestreamai_api
  USING (id = get_current_tenant_id());

-- ── users ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT TO carestreamai_api
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE TO carestreamai_api
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users
  FOR DELETE TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

-- ── policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "policies_select" ON policies;
CREATE POLICY "policies_select" ON policies
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "policies_insert" ON policies;
CREATE POLICY "policies_insert" ON policies
  FOR INSERT TO carestreamai_api
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "policies_update" ON policies;
CREATE POLICY "policies_update" ON policies
  FOR UPDATE TO carestreamai_api
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "policies_no_delete" ON policies;
CREATE POLICY "policies_no_delete" ON policies
  FOR DELETE TO carestreamai_api
  USING (false);

-- ── queries ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "queries_select" ON queries;
CREATE POLICY "queries_select" ON queries
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "queries_insert" ON queries;
CREATE POLICY "queries_insert" ON queries
  FOR INSERT TO carestreamai_api
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "queries_no_update" ON queries;
CREATE POLICY "queries_no_update" ON queries
  FOR UPDATE TO carestreamai_api
  USING (false);

DROP POLICY IF EXISTS "queries_no_delete" ON queries;
CREATE POLICY "queries_no_delete" ON queries
  FOR DELETE TO carestreamai_api
  USING (false);

-- ── email_sessions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "email_sessions_select" ON email_sessions;
CREATE POLICY "email_sessions_select" ON email_sessions
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "email_sessions_insert" ON email_sessions;
CREATE POLICY "email_sessions_insert" ON email_sessions
  FOR INSERT TO carestreamai_api
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "email_sessions_update" ON email_sessions;
CREATE POLICY "email_sessions_update" ON email_sessions
  FOR UPDATE TO carestreamai_api
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "email_sessions_no_delete" ON email_sessions;
CREATE POLICY "email_sessions_no_delete" ON email_sessions
  FOR DELETE TO carestreamai_api
  USING (false);

-- ── audit_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO carestreamai_api
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id IS NULL
  );

DROP POLICY IF EXISTS "audit_logs_no_update" ON audit_logs;
CREATE POLICY "audit_logs_no_update" ON audit_logs
  FOR UPDATE TO carestreamai_api
  USING (false);

DROP POLICY IF EXISTS "audit_logs_no_delete" ON audit_logs;
CREATE POLICY "audit_logs_no_delete" ON audit_logs
  FOR DELETE TO carestreamai_api
  USING (false);

-- ── external_regulations (platform-level, read-only) ─────────────────────────
DROP POLICY IF EXISTS "regulations_select" ON external_regulations;
CREATE POLICY "regulations_select" ON external_regulations
  FOR SELECT TO carestreamai_api
  USING (is_active = true);

-- ── plans (platform-level, read-only) ─────────────────────────────────────────
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans
  FOR SELECT TO carestreamai_api
  USING (is_active = true);


-- =============================================================================
-- SECTION 5 — Audit Log Immutability Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. UPDATE and DELETE are not permitted.';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();


-- =============================================================================
-- SECTION 6 — External Regulations Full-Text Search
-- =============================================================================

ALTER TABLE external_regulations
  ADD COLUMN IF NOT EXISTS also_known_as_tsv tsvector;

CREATE OR REPLACE FUNCTION update_also_known_as_tsv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.also_known_as_tsv :=
    to_tsvector('english', array_to_string(NEW.also_known_as, ' ') || ' ' || NEW.official_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS also_known_as_tsv_trigger ON external_regulations;
CREATE TRIGGER also_known_as_tsv_trigger
  BEFORE INSERT OR UPDATE ON external_regulations
  FOR EACH ROW
  EXECUTE FUNCTION update_also_known_as_tsv();


-- =============================================================================
-- SECTION 7 — Email Session Expiry Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_email_session_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.expires_at := NEW.last_message_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_session_expiry_trigger ON email_sessions;
CREATE TRIGGER email_session_expiry_trigger
  BEFORE INSERT OR UPDATE OF last_message_at ON email_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_email_session_expiry();


-- =============================================================================
-- SECTION 8 — Performance Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_queries_tenant_created
  ON queries (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queries_tenant_language
  ON queries (tenant_id, language_detected);

CREATE INDEX IF NOT EXISTS idx_queries_no_match
  ON queries (tenant_id, no_match) WHERE no_match = true;

CREATE INDEX IF NOT EXISTS idx_policies_tenant_status
  ON policies (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_policies_tenant_category
  ON policies (tenant_id, document_category);

CREATE INDEX IF NOT EXISTS idx_policies_review_due
  ON policies (tenant_id, last_reviewed_at)
  WHERE status = 'active' AND review_interval_days IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_sessions_expires
  ON email_sessions (tenant_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON users (tenant_id);

CREATE INDEX IF NOT EXISTS idx_regulations_tsv
  ON external_regulations USING GIN (also_known_as_tsv);

CREATE INDEX IF NOT EXISTS idx_regulations_also_known_as
  ON external_regulations USING GIN (also_known_as);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (tenant_id, entity_type, entity_id);


-- =============================================================================
-- SECTION 9 — Seed: Plans
-- Upserted so this script is safe to run multiple times.
-- =============================================================================

INSERT INTO plans (
  id,
  name,
  monthly_query_limit,
  has_advanced_analytics,
  has_cqc_report,
  price_monthly_pence,
  is_active
)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d001',
    'Starter',
    500,
    false,
    false,
    9900,
    true
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d002',
    'Professional',
    5000,
    true,
    true,
    24900,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name                   = EXCLUDED.name,
  monthly_query_limit    = EXCLUDED.monthly_query_limit,
  has_advanced_analytics = EXCLUDED.has_advanced_analytics,
  has_cqc_report         = EXCLUDED.has_cqc_report,
  price_monthly_pence    = EXCLUDED.price_monthly_pence,
  is_active              = EXCLUDED.is_active;

-- =============================================================================
-- Done. Verify with:
--   SELECT name, monthly_query_limit, has_advanced_analytics, has_cqc_report FROM plans;
-- =============================================================================
