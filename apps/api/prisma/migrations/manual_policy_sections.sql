-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-03.
-- Per-policy section (internal-policy taxonomy) + per-tenant configurable list.
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS section text;
CREATE INDEX IF NOT EXISTS policies_tenant_section_idx ON public.policies (tenant_id, section);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS policy_sections text[] NOT NULL DEFAULT '{}';
