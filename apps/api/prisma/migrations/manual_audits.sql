-- Audit system: templates, sections, questions, runs, answers
-- Also adds audit_state fields to whatsapp_sessions

CREATE TABLE IF NOT EXISTS "audit_templates" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"   TEXT,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "is_active"   BOOLEAN     NOT NULL DEFAULT true,
  "is_seed"     BOOLEAN     NOT NULL DEFAULT false,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_templates_tenant_id_idx" ON "audit_templates"("tenant_id");

CREATE TABLE IF NOT EXISTS "audit_sections" (
  "id"            TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "template_id"   TEXT    NOT NULL,
  "title"         TEXT    NOT NULL,
  "section_order" INTEGER NOT NULL,
  CONSTRAINT "audit_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_sections_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_sections_template_id_idx" ON "audit_sections"("template_id");

CREATE TABLE IF NOT EXISTS "audit_questions" (
  "id"             TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "section_id"     TEXT    NOT NULL,
  "question_text"  TEXT    NOT NULL,
  "question_order" INTEGER NOT NULL,
  "question_type"  TEXT    NOT NULL DEFAULT 'yes_no',
  "is_active"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "audit_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_questions_section_id_fkey"
    FOREIGN KEY ("section_id") REFERENCES "audit_sections"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_questions_section_id_idx" ON "audit_questions"("section_id");

CREATE TABLE IF NOT EXISTS "audit_runs" (
  "id"                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"          TEXT        NOT NULL,
  "template_id"        TEXT        NOT NULL,
  "audit_month"        TIMESTAMPTZ NOT NULL,
  "auditor_name"       TEXT,
  "auditor_role"       TEXT,
  "status"             TEXT        NOT NULL DEFAULT 'in_progress',
  "ai_recommendations" TEXT,
  "strengths"          TEXT,
  "improvements"       TEXT,
  "actions_deadline"   TEXT,
  "completed_at"       TIMESTAMPTZ,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_runs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "audit_runs_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id")
);
CREATE INDEX IF NOT EXISTS "audit_runs_tenant_status_idx"  ON "audit_runs"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "audit_runs_tenant_month_idx"   ON "audit_runs"("tenant_id", "audit_month");

CREATE TABLE IF NOT EXISTS "audit_answers" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "run_id"       TEXT        NOT NULL,
  "question_id"  TEXT        NOT NULL,
  "answer_yn"    BOOLEAN,
  "outcome_text" TEXT,
  "actions_text" TEXT,
  "answered_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_answers_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "audit_answers_run_q_unique"  UNIQUE ("run_id", "question_id"),
  CONSTRAINT "audit_answers_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "audit_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "audit_answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "audit_questions"("id")
);
CREATE INDEX IF NOT EXISTS "audit_answers_run_id_idx" ON "audit_answers"("run_id");

-- WhatsApp audit state fields
ALTER TABLE "whatsapp_sessions"
  ADD COLUMN IF NOT EXISTS "audit_run_id" TEXT,
  ADD COLUMN IF NOT EXISTS "audit_step"   TEXT;
