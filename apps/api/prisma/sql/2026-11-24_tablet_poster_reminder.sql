-- Shared tablets: how often admins are reminded to print a new "Connect a tablet" poster (monthly, quarterly, half yearly or yearly).
-- A NEW column with a default; nothing existing is changed. Safe to run more than once.
-- RUN THIS BEFORE DEPLOYING the code that reads it.
alter table public.shared_connect_keys add column if not exists reminder_months int not null default 3;   -- 1, 3, 6 or 12

-- The daily reminder job (08:00 UTC). Only accounts that have shared tablets and a poster older than their chosen interval are emailed.
-- Run this line once. To stop it later:  select cron.unschedule('cs-tablet-poster-reminders');
select cron.schedule('cs-tablet-poster-reminders', '0 8 * * *', $$select public.carestream_cron('tablet-poster-reminders')$$);
