-- =============================================================================
-- CareStreamAI — Supabase RLS Policies, Indexes & Triggers
-- §3.1 Multi-Tenancy Isolation Model | §6.6 External Regulations | §11.3 Audit Log
--
-- Run this AFTER Prisma has created the tables (prisma migrate deploy).
-- Apply via Supabase Dashboard > SQL Editor, or the Supabase CLI:
--   supabase db push --db-url $DATABASE_DIRECT_URL < supabase/rls.sql
-- =============================================================================


-- =============================================================================
-- SECTION 1 — Application Database Role
-- The API connects as carestreamai_api (not postgres/service_role).
-- RLS applies to this role. service_role bypasses RLS and is used only for
-- migrations (DATABASE_DIRECT_URL) and admin operations.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'carestreamai_api') THEN
    CREATE ROLE carestreamai_api LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
  END IF;
END
$$;

-- Grant schema and table access to the application role
GRANT USAGE ON SCHEMA public TO carestreamai_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carestreamai_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carestreamai_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carestreamai_api;


-- =============================================================================
-- SECTION 2 — Tenant Context Function
-- The API sets app.current_tenant_id at the start of each DB transaction.
-- RLS policies read it via get_current_tenant_id().
-- The 'true' flag in current_setting returns NULL (not error) if unset.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$;


-- =============================================================================
-- SECTION 3 — Enable RLS on all tenant-scoped tables
-- Default: no policy = no access. Policies below grant specific access.
-- external_regulations and plans are platform-level (different policies below).
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
-- SECTION 4 — Tenant-scoped table policies
-- Each table gets four policies: SELECT, INSERT, UPDATE, DELETE.
-- All check that the row's tenant_id matches the session's current tenant.
-- =============================================================================

-- ── tenants ──────────────────────────────────────────────────────────────────
-- A tenant can read its own record. Only the platform (service_role) can
-- insert/update/delete tenants — tenant admins cannot create new tenants.

DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT TO carestreamai_api
  USING (id = get_current_tenant_id());

-- INSERT/UPDATE/DELETE on tenants is service_role only (registration flow)

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

-- Hard-delete is not permitted (§10.5 — archive only). This policy means
-- the application cannot issue DELETE on policies via the app role.
-- The route handler archives instead (status = 'archived').
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

-- Query records are immutable once written
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
-- §11.3 — Immutable append-only. INSERT allowed; UPDATE and DELETE blocked.
-- Tenants can read their own audit logs; platform events (tenant_id IS NULL)
-- are visible to service_role only.

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO carestreamai_api
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO carestreamai_api
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id IS NULL  -- platform-level events written by service_role
  );

DROP POLICY IF EXISTS "audit_logs_no_update" ON audit_logs;
CREATE POLICY "audit_logs_no_update" ON audit_logs
  FOR UPDATE TO carestreamai_api
  USING (false);

DROP POLICY IF EXISTS "audit_logs_no_delete" ON audit_logs;
CREATE POLICY "audit_logs_no_delete" ON audit_logs
  FOR DELETE TO carestreamai_api
  USING (false);


-- =============================================================================
-- SECTION 5 — Platform-level table policies
-- external_regulations and plans are shared across all tenants — no tenant_id.
-- The app role can only read them; only service_role can write.
-- =============================================================================

-- ── external_regulations ─────────────────────────────────────────────────────
-- §6 — Read-only from tenant query pipeline. Managed by service_role only.

DROP POLICY IF EXISTS "regulations_select" ON external_regulations;
CREATE POLICY "regulations_select" ON external_regulations
  FOR SELECT TO carestreamai_api
  USING (is_active = true);

-- No INSERT/UPDATE/DELETE for carestreamai_api — service_role only (Google Sheets sync)

-- ── plans ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans
  FOR SELECT TO carestreamai_api
  USING (is_active = true);


-- =============================================================================
-- SECTION 6 — Immutability Trigger on audit_logs
-- Belt-and-suspenders: even if RLS were bypassed, this trigger fires on any
-- UPDATE or DELETE attempt on audit_logs and raises an exception.
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
-- SECTION 7 — tsvector for external_regulations.also_known_as
-- §6.2 — Full-text search index on synonyms and search terms.
-- The column is managed outside Prisma (Unsupported type in schema).
-- =============================================================================

-- Add the tsvector column if it doesn't exist
ALTER TABLE external_regulations
  ADD COLUMN IF NOT EXISTS also_known_as_tsv tsvector;

-- Function to regenerate the tsvector from the also_known_as array
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

-- Backfill existing rows
UPDATE external_regulations SET also_known_as_tsv =
  to_tsvector('english', array_to_string(also_known_as, ' ') || ' ' || official_name);


-- =============================================================================
-- SECTION 8 — Performance Indexes
-- =============================================================================

-- Prisma handles basic PK and unique indexes. These cover query patterns
-- from the analytics and RAG pipeline.

-- queries: analytics time-series
CREATE INDEX IF NOT EXISTS idx_queries_tenant_created
  ON queries (tenant_id, created_at DESC);

-- queries: language analytics (§10.3)
CREATE INDEX IF NOT EXISTS idx_queries_tenant_language
  ON queries (tenant_id, language_detected);

-- queries: policy not-found rate (§10.2)
CREATE INDEX IF NOT EXISTS idx_queries_no_match
  ON queries (tenant_id, no_match) WHERE no_match = true;

-- policies: active lookup
CREATE INDEX IF NOT EXISTS idx_policies_tenant_status
  ON policies (tenant_id, status);

-- policies: document category scoping (§4.6.5 query routing)
CREATE INDEX IF NOT EXISTS idx_policies_tenant_category
  ON policies (tenant_id, document_category);

-- policies: review reminders (§10.5)
CREATE INDEX IF NOT EXISTS idx_policies_review_due
  ON policies (tenant_id, last_reviewed_at)
  WHERE status = 'active' AND review_interval_days IS NOT NULL;

-- email_sessions: expiry check (§8.4)
CREATE INDEX IF NOT EXISTS idx_email_sessions_expires
  ON email_sessions (tenant_id, expires_at);

-- users: tenant lookup
CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON users (tenant_id);

-- external_regulations: full-text search on synonyms (§6.2)
CREATE INDEX IF NOT EXISTS idx_regulations_tsv
  ON external_regulations USING GIN (also_known_as_tsv);

-- external_regulations: array contains search
CREATE INDEX IF NOT EXISTS idx_regulations_also_known_as
  ON external_regulations USING GIN (also_known_as);

-- audit_logs: compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (tenant_id, entity_type, entity_id);


-- =============================================================================
-- SECTION 9 — Email Session Expiry Function
-- §8.4 — Sessions expire 7 days after last_message_at.
-- Called by a scheduled job (e.g. pg_cron or application cron).
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_email_sessions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Sessions past their expiry are not deleted — they are retained for audit (§8.4)
  -- This function simply returns the count of expired sessions for monitoring.
  SELECT COUNT(*) INTO expired_count
  FROM email_sessions
  WHERE expires_at < NOW();

  RETURN expired_count;
END;
$$;


-- =============================================================================
-- SECTION 10 — Helper: Update expires_at when last_message_at changes
-- Keeps expires_at = last_message_at + 7 days automatically.
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
