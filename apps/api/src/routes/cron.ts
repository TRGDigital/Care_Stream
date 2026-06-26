// Vercel Cron entry points. Scheduled in vercel.json. Authorised either by the
// x-vercel-cron header (set by Vercel on cron invocations) or, if CRON_SECRET is
// configured, a matching bearer token — so these can't be triggered externally.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { runKnowledgeGapDailyJob } from '../services/knowledge-gaps/digest'
import { sendDailyAuditReminders } from '../services/audits/reminders'
import { sendLicenceRenewalReminders } from '../services/training/licence-renewals'
import { dispatchDue } from '../services/onboarding/dispatch'
import { seedOnboardingEmails } from '../services/onboarding/seed'

export const cronRouter = Router()

function authed(req: Request): boolean {
  if (req.headers['x-vercel-cron']) return true
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization === `Bearer ${secret}`) return true
  return false
}

// Daily: snapshot open-gap counts for every tenant; on Mondays also send the
// weekly admin digest + staff auto-refreshers.
cronRouter.get('/knowledge-gaps', async (req: Request, res: Response) => {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }
  try {
    const result = await runKnowledgeGapDailyJob()
    ok(res, result)
  } catch (e: any) {
    console.error('[cron/knowledge-gaps] failed:', e?.message ?? e)
    err(res, 'JOB_FAILED', e.message, 500)
  }
})

// Daily: remind admins to finish in-progress audits and start recurring ones.
cronRouter.get('/audit-reminders', async (req: Request, res: Response) => {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }
  try {
    const result = await sendDailyAuditReminders()
    ok(res, result)
  } catch (e: any) {
    console.error('[cron/audit-reminders] failed:', e?.message ?? e)
    err(res, 'JOB_FAILED', e.message, 500)
  }
})

// Runs at 09:00 and 10:00 UTC (covers 10am UK in both BST and GMT); dispatchDue
// only sends when it's actually 10am UK. Each working day it sends the due
// onboarding email to every active admin of every enrolled tenant. `?force=1`
// (cron-authed) bypasses the 10am gate for testing.
cronRouter.get('/onboarding-emails', async (req: Request, res: Response) => {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }
  try {
    await seedOnboardingEmails().catch(() => {})   // self-heal: ensure templates exist
    const result = await dispatchDue({ force: req.query.force === '1' })
    ok(res, result)
  } catch (e: any) {
    console.error('[cron/onboarding-emails] failed:', e?.message ?? e)
    err(res, 'JOB_FAILED', e.message, 500)
  }
})

// Daily: email training-only admins when their training licences are within 30 days
// of renewal (one reminder per licence, idempotent via renewal_reminded_at).
cronRouter.get('/licence-renewals', async (req: Request, res: Response) => {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }
  try {
    const result = await sendLicenceRenewalReminders()
    ok(res, result)
  } catch (e: any) {
    console.error('[cron/licence-renewals] failed:', e?.message ?? e)
    err(res, 'JOB_FAILED', e.message, 500)
  }
})
