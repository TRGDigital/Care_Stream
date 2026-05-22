-- CQC Staff Questions & Deliveries

CREATE TABLE IF NOT EXISTS "cqc_staff_questions" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"    TEXT NOT NULL,
  "domain"       TEXT NOT NULL,
  "question"     TEXT NOT NULL,
  "model_answer" TEXT NOT NULL,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "is_seed"      BOOLEAN NOT NULL DEFAULT false,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cqc_staff_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cqc_staff_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cqc_staff_questions_tenant_id_domain_idx" ON "cqc_staff_questions"("tenant_id", "domain");
CREATE INDEX IF NOT EXISTS "cqc_staff_questions_tenant_id_is_active_idx" ON "cqc_staff_questions"("tenant_id", "is_active");

CREATE TABLE IF NOT EXISTS "cqc_staff_deliveries" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"    TEXT NOT NULL,
  "question_id"  TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "rephrased_q"  TEXT NOT NULL,
  "channel"      TEXT NOT NULL DEFAULT 'whatsapp',
  "answer_text"  TEXT,
  "score"        INTEGER,
  "feedback"     TEXT,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "sent_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "answered_at"  TIMESTAMPTZ,
  "evaluated_at" TIMESTAMPTZ,
  CONSTRAINT "cqc_staff_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cqc_staff_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "cqc_staff_deliveries_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "cqc_staff_questions"("id") ON DELETE CASCADE,
  CONSTRAINT "cqc_staff_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cqc_staff_deliveries_tenant_id_user_id_idx" ON "cqc_staff_deliveries"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "cqc_staff_deliveries_tenant_id_status_idx" ON "cqc_staff_deliveries"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "cqc_staff_deliveries_user_id_status_idx" ON "cqc_staff_deliveries"("user_id", "status");
