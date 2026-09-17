-- Audits: scheduled audits assigned to a named person with a due date, optionally repeating.
-- API-only table: RLS on, no policies.
-- Applied 2026-09-17 via Supabase MCP (migration audit_assignments).
create table if not exists public.audit_assignments (
  id                  text primary key default gen_random_uuid()::text,
  tenant_id           text not null,
  template_id         text not null references public.audit_templates(id) on delete cascade,
  assigned_user_id    text not null,
  subject             text,
  subject_room        text,
  due_date            timestamp(3) not null,
  repeat              text not null default 'none',
  status              text not null default 'open',
  run_id              text,
  previous_id         text,
  notes               text,
  completed_at        timestamp(3),
  reminded_at         timestamp(3),
  overdue_notified_at timestamp(3),
  escalated_at        timestamp(3),
  created_by          text,
  created_at          timestamp(3) not null default now(),
  updated_at          timestamp(3) not null default now()
);
create index if not exists audit_assignments_tenant_id_status_due_date_idx on public.audit_assignments (tenant_id, status, due_date);
create index if not exists audit_assignments_assigned_user_id_status_idx on public.audit_assignments (assigned_user_id, status);
create index if not exists audit_assignments_run_id_idx on public.audit_assignments (run_id);
alter table public.audit_assignments enable row level security;
