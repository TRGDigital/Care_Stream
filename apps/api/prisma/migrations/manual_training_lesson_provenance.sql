-- Ad-hoc lesson provenance: what a generated lesson was built from, and which source
-- supports each section and question. Platform-internal (read by /admin/adhoc-training);
-- never served to homes, which is why it is its own table rather than lesson JSON.
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code
-- deploy that writes it. Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS training_lesson_provenance (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 0,       -- the module's questions_version this generation produced
  sources     JSONB NOT NULL DEFAULT '[]',      -- the exact passages the generator read: [{ id, kind, title, section, text }]
  attribution JSONB NOT NULL DEFAULT '[]',      -- per section/question: [{ ref, kind, index, label, status, source_id, source_kind, source_title, quote }]
  summary     JSONB NOT NULL DEFAULT '{}',      -- counts by source kind, for questions and sections
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_lesson_provenance_module_idx ON training_lesson_provenance (module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS training_lesson_provenance_tenant_idx ON training_lesson_provenance (tenant_id);

-- Every new table gets RLS. No policies: only the API (service connection) reads or writes it.
ALTER TABLE training_lesson_provenance ENABLE ROW LEVEL SECURITY;

COMMIT;
