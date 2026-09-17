-- Audits: closing actions properly (what was done, photos, more time, reminders, re-check at the
-- next audit) and signatures on audit completion and manager sign-off.
-- Applied 2026-09-17 via Supabase MCP (migration audit_actions_closeout_signatures).
alter table public.audit_actions add column if not exists completion_note text;
alter table public.audit_actions add column if not exists extension_requested_to timestamp(3);
alter table public.audit_actions add column if not exists extension_reason text;
alter table public.audit_actions add column if not exists extension_status text;
alter table public.audit_actions add column if not exists extension_decided_by text;
alter table public.audit_actions add column if not exists reminded_at timestamp(3);
alter table public.audit_actions add column if not exists overdue_notified_at timestamp(3);
alter table public.audit_actions add column if not exists escalated_at timestamp(3);
alter table public.audit_actions add column if not exists verified_result text;
alter table public.audit_actions add column if not exists verified_at timestamp(3);
alter table public.audit_actions add column if not exists verified_by text;
alter table public.audit_actions add column if not exists verified_run_id text;
alter table public.audit_actions add column if not exists verify_note text;

create table if not exists public.audit_action_evidence (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null,
  action_id   text not null references public.audit_actions(id) on delete cascade,
  s3_key      text not null,
  file_name   text not null,
  file_type   text not null,
  size_bytes  integer not null default 0,
  scan_status text not null default 'skipped',
  uploaded_by text,
  created_at  timestamp(3) not null default now()
);
create index if not exists audit_action_evidence_action_id_idx on public.audit_action_evidence (action_id);
alter table public.audit_action_evidence enable row level security;

alter table public.audit_runs add column if not exists auditor_signature_key text;
alter table public.audit_runs add column if not exists auditor_signed_name text;
alter table public.audit_runs add column if not exists auditor_signed_at timestamp(3);
alter table public.audit_runs add column if not exists manager_signature_key text;
alter table public.audit_runs add column if not exists manager_signed_at timestamp(3);
