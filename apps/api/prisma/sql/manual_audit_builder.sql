-- Audits: editable and versioned audits, more question types, conditional questions, CQC tags.
-- Applied 2026-09-17 via Supabase MCP (migration audit_builder_question_types_versions).
alter table public.audit_templates add column if not exists version integer not null default 1;
alter table public.audit_templates add column if not exists requires_shift boolean not null default false;
update public.audit_templates set requires_shift = true where name = 'Fire Marshall Checklist' and tenant_id is null;

alter table public.audit_questions add column if not exists settings jsonb;
alter table public.audit_questions add column if not exists show_if jsonb;
alter table public.audit_questions add column if not exists quality_statement_id text;
alter table public.audit_questions add column if not exists created_at timestamp(3) not null default now();
-- Existing questions predate every completed run, so they keep showing on old reports.
update public.audit_questions set created_at = '2000-01-01' where created_at > now() - interval '1 hour';

alter table public.audit_answers add column if not exists answer_value text;
alter table public.audit_runs add column if not exists template_version integer;
alter table public.tenants add column if not exists hidden_audit_templates text[] not null default '{}';

create table if not exists public.audit_template_versions (
  id          text primary key default gen_random_uuid()::text,
  template_id text not null references public.audit_templates(id) on delete cascade,
  tenant_id   text,
  version     integer not null,
  snapshot    jsonb not null,
  changed_by  text,
  change_note text,
  created_at  timestamp(3) not null default now()
);
create index if not exists audit_template_versions_template_id_idx on public.audit_template_versions (template_id);
alter table public.audit_template_versions enable row level security;
