-- Audits: the PDF report generated when an audit is completed or signed off, saved against the run.
-- Applied 2026-09-17 via Supabase MCP (migration audit_report_pdf).
alter table public.audit_runs add column if not exists report_pdf_key text;
alter table public.audit_runs add column if not exists report_generated_at timestamp(3);
