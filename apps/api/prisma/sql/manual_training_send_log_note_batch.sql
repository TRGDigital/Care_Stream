-- Training > Schedule Training Questions Delivery: one record per triggered send.
-- batch_id groups the per-staff rows of a single send; note keeps the admin's note (incident
-- description, return-to-work notes, manual send note) apart from the delivery outcome.
-- Applied 2026-09-17 via Supabase MCP (migration training_send_log_note_batch).
alter table public.training_send_log add column if not exists note text;
alter table public.training_send_log add column if not exists batch_id text;
create index if not exists training_send_log_tenant_id_batch_id_idx on public.training_send_log (tenant_id, batch_id);
