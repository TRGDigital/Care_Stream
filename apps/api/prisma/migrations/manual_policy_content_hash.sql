-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-03.
-- SHA-256 of uploaded file bytes for byte-for-byte duplicate detection.
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS policies_tenant_hash_idx ON public.policies (tenant_id, content_hash);
