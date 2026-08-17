-- Training programmes (diplomas / pathways)
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg.
-- Idempotent: safe to re-run.
--
-- A programme groups existing training_modules into an ordered container with one
-- completion rule, one synoptic assessment and one certificate. Unit progress is
-- NOT stored here — it is derived from the learner's ordinary training_enrollments
-- rows, so nothing about the existing player or renewal logic changes.

BEGIN;

CREATE TABLE IF NOT EXISTS training_programmes (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id              TEXT REFERENCES tenants(id),
  slug                   TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL,
  kind                   TEXT NOT NULL DEFAULT 'diploma',
  group_key              TEXT,
  care_setting           TEXT,
  job_roles              TEXT[] NOT NULL DEFAULT '{}',
  sort_order             INTEGER NOT NULL DEFAULT 0,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  -- pilot gate: empty = all tenants see it once published; non-empty = only these
  pilot_tenant_ids       TEXT[] NOT NULL DEFAULT '{}',
  -- completion rule
  sequential             BOOLEAN NOT NULL DEFAULT FALSE,
  synoptic_questions     JSONB,
  synoptic_pass_mark     INTEGER NOT NULL DEFAULT 80,
  require_practical      BOOLEAN NOT NULL DEFAULT FALSE,
  require_reflection     BOOLEAN NOT NULL DEFAULT TRUE,
  renewal_months         INTEGER,
  -- presentation / evidence base
  outcomes               JSONB,
  standards              JSONB,
  duration_minutes       INTEGER,
  illustration_key       TEXT,
  -- CPD governance
  approved               BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at            TIMESTAMPTZ,
  approved_by            TEXT,
  attested_by_name       TEXT,
  attested_by_role       TEXT,
  attested_at            TIMESTAMPTZ,
  cpd_accredited         BOOLEAN NOT NULL DEFAULT FALSE,
  independently_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  -- shop SKU
  price_pence            INTEGER,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial uniques: one slug per tenant, and one slug among platform templates
-- (tenant_id IS NULL, where a plain UNIQUE would not constrain).
CREATE UNIQUE INDEX IF NOT EXISTS training_programmes_tenant_slug_key
  ON training_programmes (tenant_id, slug) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS training_programmes_template_slug_key
  ON training_programmes (slug) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS training_programmes_tenant_active_idx
  ON training_programmes (tenant_id, is_active);

CREATE TABLE IF NOT EXISTS training_programme_units (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  programme_id TEXT NOT NULL REFERENCES training_programmes(id) ON DELETE CASCADE,
  module_id    TEXT NOT NULL REFERENCES training_modules(id),
  "order"      INTEGER NOT NULL,
  is_optional  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_programme_units_programme_module_key UNIQUE (programme_id, module_id)
);

CREATE INDEX IF NOT EXISTS training_programme_units_programme_order_idx
  ON training_programme_units (programme_id, "order");

CREATE TABLE IF NOT EXISTS training_programme_enrollments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id        TEXT NOT NULL,
  user_id          TEXT NOT NULL,
  programme_id     TEXT NOT NULL REFERENCES training_programmes(id),
  status           TEXT NOT NULL DEFAULT 'not_started',
  renewal_count    INTEGER NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  due_date         TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  synoptic_score   INTEGER,
  synoptic_total   INTEGER,
  synoptic_at      TIMESTAMPTZ,
  synoptic_answers JSONB,
  reflection       TEXT,
  reflection_at    TIMESTAMPTZ,
  certificate_url  TEXT,
  assigned_by      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_programme_enrollments_unique_run
    UNIQUE (tenant_id, user_id, programme_id, renewal_count)
);

CREATE INDEX IF NOT EXISTS training_programme_enrollments_tenant_user_idx
  ON training_programme_enrollments (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS training_programme_enrollments_programme_idx
  ON training_programme_enrollments (programme_id);

COMMIT;

-- ── Addendum (run separately if the block above was already applied) ──────────
-- Pilot gate. Lets a published programme be limited to named tenants so a new
-- diploma can be tested on the live domain without reaching real clients.
ALTER TABLE training_programmes
  ADD COLUMN IF NOT EXISTS pilot_tenant_ids TEXT[] NOT NULL DEFAULT '{}';
