-- Audit small edits on every plan: a home's own edited version of a built-in audit remembers which built-in
-- audit it came from. Safe to run more than once. Run BEFORE using Edit questions in the audit preview.
alter table audit_templates add column if not exists source_template_id text;
create index if not exists audit_templates_tenant_source_idx on audit_templates (tenant_id, source_template_id);
