-- Scheduled jobs, moved from vercel.json into Postgres.
--
-- WHY: every Vercel cron on this project stopped on 5 June 2026 and nobody found out for 96
-- days. In that time no tenant got an audit reminder, a credential-expiry warning, a
-- policy-review reminder, a supervision reminder or a licence-renewal notice. The database is
-- the one component that has to be up for anything else to work, and unlike Vercel's crons it
-- keeps a queryable run history (cron.job_run_details), so the same failure is visible.
--
-- RUN THIS ONCE, in the Supabase SQL editor, against the CareStream project.
-- Step 2 needs the CRON_SECRET value; everything else can be run as-is.

-- ── 1. Extensions ────────────────────────────────────────────────────────────
-- pg_net is already installed and in use. pg_cron is available but not yet enabled.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 2. The bearer token, in Vault rather than in this file ───────────────────
-- The API accepts either Vercel's x-vercel-cron header or `Authorization: Bearer $CRON_SECRET`.
-- Vercel no longer sends the former, so these calls use the latter.
--
-- Paste the value from ~/.carestream/cron-secret in place of PASTE_CRON_SECRET_HERE.
-- It is stored encrypted; nothing below ever prints it.
--
--   select vault.create_secret('PASTE_CRON_SECRET_HERE', 'carestream_cron_secret',
--                              'Bearer token for the CareStream /cron endpoints');
--
-- To rotate it later:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'carestream_cron_secret'),
--     'NEW_VALUE');

-- ── 3. One helper, so a schedule change is a one-liner ───────────────────────
-- NOTE ON TIMEOUTS: pg_net waits for the response, and some of these jobs run for minutes.
-- The timeout is generous, but if pg_net does give up early the request has still been
-- delivered and the API keeps working. That case is visible rather than silent: the wrapper
-- in routes/cron.ts writes its cron_runs row BEFORE starting, so a cut-off job shows as
-- started-but-never-finished and the daily report counts it as failed.
create or replace function public.carestream_cron(path text)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_req_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'carestream_cron_secret';

  if v_secret is null then
    raise exception 'carestream_cron_secret is not in the vault — see step 2';
  end if;

  select net.http_get(
    url                  := 'https://api.carestreamai.com/cron/' || path,
    headers              := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 280000
  ) into v_req_id;

  return v_req_id;
end;
$$;

revoke all on function public.carestream_cron(text) from public, anon, authenticated;

-- ── 4. The schedules ─────────────────────────────────────────────────────────
-- Times are UTC, matching the old vercel.json. The daily ones are staggered by a few minutes
-- so five jobs do not hit the API in the same second, which the old config did.
-- unschedule-then-schedule so this file can be re-run safely.

select cron.unschedule('cs-knowledge-gaps')            where exists (select 1 from cron.job where jobname = 'cs-knowledge-gaps');
select cron.unschedule('cs-audit-reminders')           where exists (select 1 from cron.job where jobname = 'cs-audit-reminders');
select cron.unschedule('cs-credential-expiry')         where exists (select 1 from cron.job where jobname = 'cs-credential-expiry');
select cron.unschedule('cs-policy-review-reminders')   where exists (select 1 from cron.job where jobname = 'cs-policy-review-reminders');
select cron.unschedule('cs-supervision-reminders')     where exists (select 1 from cron.job where jobname = 'cs-supervision-reminders');
select cron.unschedule('cs-licence-renewals')          where exists (select 1 from cron.job where jobname = 'cs-licence-renewals');
select cron.unschedule('cs-onboarding-emails')         where exists (select 1 from cron.job where jobname = 'cs-onboarding-emails');
select cron.unschedule('cs-regulation-source-monitor') where exists (select 1 from cron.job where jobname = 'cs-regulation-source-monitor');
select cron.unschedule('cs-daily-report')              where exists (select 1 from cron.job where jobname = 'cs-daily-report');

select cron.schedule('cs-knowledge-gaps',            '0 7 * * *',    $$select public.carestream_cron('knowledge-gaps')$$);
select cron.schedule('cs-audit-reminders',           '0 8 * * *',    $$select public.carestream_cron('audit-reminders')$$);
select cron.schedule('cs-credential-expiry',         '5 8 * * *',    $$select public.carestream_cron('credential-expiry')$$);
select cron.schedule('cs-policy-review-reminders',   '10 8 * * *',   $$select public.carestream_cron('policy-review-reminders')$$);
select cron.schedule('cs-supervision-reminders',     '15 8 * * *',   $$select public.carestream_cron('supervision-reminders')$$);
select cron.schedule('cs-licence-renewals',          '0 9 * * *',    $$select public.carestream_cron('licence-renewals')$$);
-- Two runs: dispatchDue only sends at 10am UK, which is 09:00 UTC in BST and 10:00 in GMT.
select cron.schedule('cs-onboarding-emails',         '0 9,10 * * *', $$select public.carestream_cron('onboarding-emails')$$);
select cron.schedule('cs-regulation-source-monitor', '0 6 * * 1',    $$select public.carestream_cron('regulation-source-monitor')$$);
-- Every 15 minutes: tenant-defined scheduled training-question rules store their own
-- send_time (Europe/London), so the route decides what is due; this just wakes it up.
select cron.schedule('cs-training-delivery',         '*/15 * * * *', $$select public.carestream_cron('training-delivery')$$);
-- Last, so it reports on the morning's runs rather than yesterday's.
select cron.schedule('cs-daily-report',              '0 11 * * *',   $$select public.carestream_cron('daily-report')$$);

-- ── 5. Checking it ───────────────────────────────────────────────────────────
--   select jobname, schedule, active from cron.job order by jobname;
--   select j.jobname, r.status, r.start_time, r.return_message
--     from cron.job_run_details r join cron.job j using (jobid)
--    order by r.start_time desc limit 20;
--
-- What the API itself recorded (the heartbeat the daily report reads):
--   select job, started_at, ok, duration_ms, summary from cron_runs order by started_at desc limit 20;
--
-- The HTTP responses pg_net received:
--   select id, status_code, created from net._http_response order by created desc limit 20;
