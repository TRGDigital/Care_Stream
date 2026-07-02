-- Workforce compliance register V2: per-credential document uploads.
-- Applied to prod via Supabase on 2026-07-02. Adds the evidence document columns
-- to staff_credentials (file itself stored in S3 under tenants/{tenant}/credentials/{user}/).

ALTER TABLE staff_credentials
  ADD COLUMN IF NOT EXISTS evidence_key         text,
  ADD COLUMN IF NOT EXISTS evidence_name        text,
  ADD COLUMN IF NOT EXISTS evidence_type        text,
  ADD COLUMN IF NOT EXISTS evidence_size        integer,
  ADD COLUMN IF NOT EXISTS evidence_uploaded_at timestamp(3);
