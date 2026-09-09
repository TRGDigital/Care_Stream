// Scheduled job entry points. Authorised either by the x-vercel-cron header or, now that
// CRON_SECRET is configured, a matching bearer token — so these can't be triggered externally.
//
// Scheduled from Postgres (pg_cron + pg_net), not from vercel.json: every one of these
// stopped silently on 5 June 2026 and nobody found out for 96 days. See
// manual_cron_schedules.sql. The schedule lives in the database because the database is the
// one component that has to be up for anything else to work.
//
// DO NOT add a "crons" block back to apps/api/vercel.json. Both schedulers running would
// fire every job twice. If Vercel scheduling is ever wanted again, remove the pg_cron jobs
// first (see step 4 of that migration).
//
// Note for anyone tempted to leave a note in vercel.json explaining that: you cannot. Vercel
// validates the file against a strict schema and fails the BUILD on any unrecognised
// top-level key, before it prints a single build log. That is what this comment is for.
//
// Every job runs through `job()` below, which records a row in cron_runs whether it succeeds
// or fails. /cron/daily-report then reads EXPECTED jobs against that table, so a job that
// silently stops appears as a missing row rather than as nothing at all.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { runKnowledgeGapDailyJob } from '../services/knowledge-gaps/digest'
import { sendDailyAuditReminders } from '../services/audits/reminders'
import { sendLicenceRenewalReminders } from '../services/training/licence-renewals'
import { dispatchDue } from '../services/onboarding/dispatch'
import { seedOnboardingEmails } from '../services/onboarding/seed'
import { checkRegulationSources } from '../services/regulations/source-monitor'
import { reviewPendingChanges } from '../services/regulations/change-review'
import { runCredentialExpiryAllTenants } from '../services/workforce/credentialExpiry'
import { runSupervisionReminders } from '../services/workforce/supervisionReminders'
import { runPolicyReviewReminders } from '../services/policies/review-reminders'
import { buildCronReport, sendCronReport } from '../services/ops/cron-report'

export const cronRouter = Router()

function authed(req: Request): boolean {
  if (req.headers['x-vercel-cron']) return true
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization === `Bearer ${secret}`) return true
  return false
}

/** Run one scheduled job, recording the attempt either way.
 *
 *  The row is written BEFORE the work starts, so a job that crashes the process or is killed
 *  mid-run still leaves evidence it began. A job that never appears at all is the case the
 *  daily report is looking for. */
async function job(
  name: string,
  req: Request,
  res: Response,
  fn: () => Promise<unknown>,
): Promise<void> {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }

  const startedAt = Date.now()
  const run = await (prisma as any).cronRun
    .create({ data: { job: name } })
    .catch(() => null)   // never let bookkeeping stop the job itself

  const finish = (ok_: boolean, summary: unknown, error: string) =>
    run
      ? (prisma as any).cronRun.update({
          where: { id: run.id },
          data: {
            ok: ok_,
            finished_at: new Date(),
            duration_ms: Date.now() - startedAt,
            summary: (summary ?? null) as any,
            error: error.slice(0, 2000),
          },
        }).catch(() => {})
      : Promise.resolve()

  try {
    const result = await fn()
    await finish(true, result, '')
    ok(res, result as any)
  } catch (e: any) {
    const message = e?.message ?? String(e)
    console.error(`[cron/${name}] failed:`, message)
    await finish(false, null, message)
    err(res, 'JOB_FAILED', message, 500)
  }
}

// Daily: snapshot open-gap counts for every tenant; on Mondays also send the
// weekly admin digest + staff auto-refreshers.
cronRouter.get('/knowledge-gaps', (req, res) =>
  job('knowledge-gaps', req, res, () => runKnowledgeGapDailyJob()))

// Daily: email a tenant's admins when policies reach their review date. Several policies due on
// the same day go in ONE email. Fires once per review cycle (re-armed when a new date is set).
cronRouter.get('/policy-review-reminders', (req, res) =>
  job('policy-review-reminders', req, res, () => runPolicyReviewReminders({ force: req.query.force === '1' })))

// Daily: email Enterprise admins a digest of staff credentials (DBS, right to
// work, registration) that have expired or expire within 30 days.
cronRouter.get('/credential-expiry', (req, res) =>
  job('credential-expiry', req, res, () => runCredentialExpiryAllTenants()))

// Daily: remind staff (and admins) the day before a booked supervision/appraisal.
cronRouter.get('/supervision-reminders', (req, res) =>
  job('supervision-reminders', req, res, () => runSupervisionReminders()))

// Daily: remind admins to finish in-progress audits and start recurring ones.
cronRouter.get('/audit-reminders', (req, res) =>
  job('audit-reminders', req, res, () => sendDailyAuditReminders()))

// Runs at 09:00 and 10:00 UTC (covers 10am UK in both BST and GMT); dispatchDue
// only sends when it's actually 10am UK. Each working day it sends the due
// onboarding email to every active admin of every enrolled tenant. `?force=1`
// (cron-authed) bypasses the 10am gate for testing.
cronRouter.get('/onboarding-emails', (req, res) =>
  job('onboarding-emails', req, res, async () => {
    await seedOnboardingEmails().catch(() => {})   // self-heal: ensure templates exist
    return dispatchDue({ force: req.query.force === '1' })
  }))

// Weekly: fingerprint each regulation's source URLs and flag any whose source page
// changed for platform-team review (never auto-edits content).
cronRouter.get('/regulation-source-monitor', (req, res) =>
  job('regulation-source-monitor', req, res, async () => {
    const scan = await checkRegulationSources()
    // Explain what was found in the same run, so Monday morning brings changes that already
    // read as English. Reviewed separately from detection, so a model failure here costs the
    // summaries and not the detections.
    const review = await reviewPendingChanges().catch(() => ({ reviewed: 0, failed: 0 }))
    return { ...scan, ...review }
  }))

// Daily: email training-only admins when their training licences are within 30 days
// of renewal (one reminder per licence, idempotent via renewal_reminded_at).
cronRouter.get('/licence-renewals', (req, res) =>
  job('licence-renewals', req, res, () => sendLicenceRenewalReminders()))

// Daily, last: email the platform owner what ran, what it captured, and — the point of the
// whole thing — what was due and did not run at all.
cronRouter.get('/daily-report', (req, res) =>
  job('daily-report', req, res, async () => {
    const report = await buildCronReport()
    await sendCronReport(report)
    return report
  }))
