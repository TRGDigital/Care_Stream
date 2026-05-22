-- Manual migration: Training question versioning, locking, and gap tracking

-- AlterTable: add versioning/locking fields to training_modules
ALTER TABLE "training_modules"
  ADD COLUMN IF NOT EXISTS "questions_locked"    BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "questions_locked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "questions_version"   INTEGER   NOT NULL DEFAULT 0;

-- AlterTable: snapshot question text on each answer so the record survives question changes
ALTER TABLE "training_answers"
  ADD COLUMN IF NOT EXISTS "question_text" TEXT;

-- CreateTable: versioned snapshots of a module's question set
CREATE TABLE IF NOT EXISTS "training_question_versions" (
    "id"         TEXT        NOT NULL,
    "module_id"  TEXT        NOT NULL,
    "version"    INTEGER     NOT NULL,
    "questions"  JSONB       NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "training_question_versions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "training_question_versions_module_id_version_key"
  ON "training_question_versions"("module_id", "version");

CREATE INDEX IF NOT EXISTS "training_question_versions_module_id_idx"
  ON "training_question_versions"("module_id");

-- FK
ALTER TABLE "training_question_versions"
  DROP CONSTRAINT IF EXISTS "training_question_versions_module_id_fkey";

ALTER TABLE "training_question_versions"
  ADD CONSTRAINT "training_question_versions_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "training_modules"("id") ON DELETE CASCADE;
