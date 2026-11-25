-- Audits became a third collection kind; the table's check still allowed only two, so every audit draft was refused.
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg. Already run on 2026-11-25.
begin;
alter table public.collections drop constraint if exists collections_kind_check;
alter table public.collections add constraint collections_kind_check
  check (kind in ('policies','training','audits'));
commit;
