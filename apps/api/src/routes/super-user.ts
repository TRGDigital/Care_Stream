// Super User routes. Mounted at /super-user after requireAuth.
//
//   GET  /summary        admin: how the company's Super User is getting on (measures and colleague counts; no voucher detail)
//   GET  /me             anyone signed in: am I the Super User, and have I agreed yet
//   POST /consent        the Super User agrees, or declines (which removes the tag)
//   POST /active-time    the hub's heartbeat: seconds of real use, recorded only for a Super User who has agreed
//
// Colleagues are never named or timed here. The voucher is handled on the platform side only.
import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { loadSuperUser, currentSuperUser, answerConsent, recordActiveSeconds, WINDOW_DAYS } from '../lib/super-user'
import { writeAuditLog } from '../lib/audit'

export const superUserRouter = Router()

superUserRouter.get('/summary', requireAdmin, async (req: Request, res: Response) => {
  try {
    const r = await loadSuperUser(req.user!.tenant_id)
    if (!r) { ok(res, { super_user: null }); return }
    // What an administrator sees: the person, the window, how they are using the hub, and the colleague counts. No eligibility verdict or voucher.
    ok(res, { super_user: { person: r.person, tagged_at: r.tagged_at, consent_at: r.consent_at, window: r.window, status: r.status === 'awaiting_consent' ? 'awaiting_consent' : 'active', measures: r.measures, colleagues: r.colleagues } })
  } catch (e: any) { err(res, 'FAILED', e?.message ?? 'Could not load the Super User.', 500) }
})

superUserRouter.get('/me', async (req: Request, res: Response) => {
  const su = await currentSuperUser(req.user!.tenant_id).catch(() => null)
  const mine = !!su && su.id === req.user!.sub
  ok(res, { is_super_user: mine, consented: mine && !!su.super_user_consent_at, tagged_at: mine ? su.super_user_since : null, window_days: WINDOW_DAYS })
})

superUserRouter.post('/consent', async (req: Request, res: Response) => {
  const accept = req.body?.accept === true
  const r = await answerConsent(req.user!.tenant_id, req.user!.sub, accept)
  if (r === 'not_super_user') { err(res, 'NOT_FOUND', 'You are not the Super User.', 404); return }
  // An admin acting as the person (test accounts only) is recorded as such, not as the person.
  writeAuditLog({ tenant_id: req.user!.tenant_id, user_id: req.user!.sub, event_type: accept ? 'super_user_consent' : 'super_user_untagged', entity_type: 'user', entity_id: req.user!.sub, metadata: { accepted: accept, by: (req.user as any)?.imp ? `admin acting as them (${(req.user as any).imp.by_name ?? 'admin'})` : 'self' } }).catch(() => {})
  ok(res, { result: r })
})

superUserRouter.post('/active-time', async (req: Request, res: Response) => {
  const recorded = await recordActiveSeconds(req.user!.tenant_id, req.user!.sub, Number(req.body?.seconds)).catch(() => false)
  ok(res, { recorded })
})
