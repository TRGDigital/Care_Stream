-- Reminders re-sent by an admin from Training > Staff progress. Additive, with safe defaults.
-- Applied 2026-09-17 via Supabase MCP (migration training_enrollment_reminders).
alter table public.training_enrollments add column if not exists last_reminded_at timestamp(3);
alter table public.training_enrollments add column if not exists reminder_count integer not null default 0;
