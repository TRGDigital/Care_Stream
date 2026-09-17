-- Training > Training Matrix: the digital training each job role must hold.
-- job_role '*' means every staff member. Face-to-face requirements stay in face_to_face_mandatory.
-- API-only table: RLS on, no policies.
-- Applied 2026-09-17 via Supabase MCP (migration training_role_requirements).
create table if not exists public.training_role_requirements (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null,
  job_role    text not null,
  module_id   text not null,
  module_name text not null,
  created_at  timestamp(3) not null default now()
);
create unique index if not exists training_role_requirements_tenant_id_job_role_module_id_key on public.training_role_requirements (tenant_id, job_role, module_id);
create index if not exists training_role_requirements_tenant_id_idx on public.training_role_requirements (tenant_id);
alter table public.training_role_requirements enable row level security;
