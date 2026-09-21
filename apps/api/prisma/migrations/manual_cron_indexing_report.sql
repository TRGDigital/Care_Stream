-- Weekly RalfyIndex report (both sites), Monday 07:00 UTC = 08:00 UK in summer, 07:00 in winter.
-- Same pattern as manual_cron_schedules.sql: pg_cron calls the API through public.carestream_cron,
-- which sends the CRON_SECRET bearer from the vault. Idempotent.
select cron.unschedule('cs-indexing-report') where exists (select 1 from cron.job where jobname = 'cs-indexing-report');
select cron.schedule('cs-indexing-report', '0 7 * * 1', $$select public.carestream_cron('indexing-report')$$);
