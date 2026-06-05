// Vercel Cron entry points. Scheduled in vercel.json. Authorised either by the
// x-vercel-cron header (set by Vercel on cron invocations) or, if CRON_SECRET is
// configured, a matching bearer token — so these can't be triggered externally.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { runKnowledgeGapDailyJob } from '../services/knowledge-gaps/digest'
import { sendDailyAuditReminders } from '../services/audits/reminders'

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
