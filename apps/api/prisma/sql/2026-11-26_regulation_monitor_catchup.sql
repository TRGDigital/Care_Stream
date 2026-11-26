-- A daily catch-up behind the Monday regulation source check. The Monday run now fetches every source oldest first inside its time budget;
-- this only picks up sources not checked in the last 5 days (and explains any new changes), so a Monday run that is cut short costs a day, not a week.
-- Tuesday to Sunday at 06:30 UTC. Safe to run more than once.
select cron.unschedule('cs-regulation-source-catchup') where exists (select 1 from cron.job where jobname = 'cs-regulation-source-catchup');
select cron.schedule('cs-regulation-source-catchup', '30 6 * * 2-7', $$select public.carestream_cron('regulation-source-monitor?catchup=1')$$);
