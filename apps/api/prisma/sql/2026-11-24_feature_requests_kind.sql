-- The support menu's "Report a Bug" reuses the feature requests table. Adds which kind a row is and the page it was raised from.
-- Existing rows are all feature requests. Safe to run more than once. The app works before this is run (bugs still email; the kind is saved once it exists).
alter table public.feature_requests add column if not exists kind text not null default 'feature';   -- feature | bug
alter table public.feature_requests add column if not exists page_url text;
