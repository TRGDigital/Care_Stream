-- Ask CareStream phase 1b: letters and newsletters go through draft -> pending -> approved -> shared. The ask_documents table from 2026-11-25_ask_carestream.sql already has
-- status, approved_by, approved_at, version and a jsonb data column (the letter's values, the checklist and the share record), so NO new column is needed. This only adds an index
-- so the approvals list stays quick. Safe to run more than once. Nothing existing is changed.
create index if not exists ask_documents_status_idx on public.ask_documents (tenant_id, status, type);
