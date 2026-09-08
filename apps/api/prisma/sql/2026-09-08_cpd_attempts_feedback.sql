-- CPD resubmission platform changes. Run BEFORE deploying the matching code
-- (per repo convention, SQL runs first; the columns are additive and safe).
ALTER TABLE training_enrollments
  ADD COLUMN IF NOT EXISTS eval_content        INTEGER,
  ADD COLUMN IF NOT EXISTS eval_navigation     INTEGER,
  ADD COLUMN IF NOT EXISTS eval_accessibility  INTEGER,
  ADD COLUMN IF NOT EXISTS eval_interactivity  INTEGER,
  ADD COLUMN IF NOT EXISTS assessment_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relearn_required    BOOLEAN NOT NULL DEFAULT false;
