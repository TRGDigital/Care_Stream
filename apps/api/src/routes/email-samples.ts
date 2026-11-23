// "Send me a sample": an administrator can send themselves any staff email, exactly as the system builds it, to check the design.
//   GET  /email-samples        the names you can send
//   POST /email-samples/send   { name, to? }   sends ONE sample to the administrator's own address, or (with `to`) to one of our own team addresses. Never to anyone else.
// The sample carries the real organisation logo and the real name and picture of the person asking, so it is what staff will see.
// Sample data is made up (staff name, dates, courses). Sign in links and reset links in samples do not work.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import * as out from '../services/email/outbound'
import { personEmailCases, otherStaffEmailCases } from '../services/email/person-email-samples'
import { withForcedPerson } from '../lib/staff-email-finalize'
import { siteUrl } from '../lib/urls'

export const emailSamplesRouter = Router()
emailSamplesRouter.use(requireAdmin)

const sentAt = new Map<string, number[]>()   // 40 samples an hour per administrator
function allow(userId: string): boolean {
  const now = Date.now(); const list = (sentAt.get(userId) ?? []).filter(t => now - t < 3_600_000)
  if (list.length >= 40) return false
  list.push(now); sentAt.set(userId, list); return true
}

async function me(req: Request) {
  const u = await (prisma as any).user.findUnique({ where: { id: req.user!.sub }, select: { id: true, name: true, email: true, tenant_id: true } })
  const t = u ? await (prisma as any).tenant.findUnique({ where: { id: u.tenant_id }, select: { name: true } }) : null
  return u ? { ...u, orgName: t?.name ?? 'Your service' } : null
}
const TEAM_ADDRESS = /@(trgdigital\.co\.uk|orreryintelligence\.com|crosswayscarehome\.co\.uk)$/i   // the owner's own mailboxes only
function cases(u: { id: string; name: string; email: string; orgName: string }, to?: string) {
  const portal = siteUrl()
  const base = { to: to || u.email, name: u.name, orgName: u.orgName }
  return { ...personEmailCases(out, { ...base, actorUserId: u.id }, portal), ...otherStaffEmailCases(out, base, portal) } as Record<string, () => Promise<void>>
}

emailSamplesRouter.get('/', async (req: Request, res: Response) => {
  const u = await me(req); if (!u) { err(res, 'NOT_FOUND', 'User not found.', 404); return }
  ok(res, { names: Object.keys(cases(u)), sends_to: u.email })
})

emailSamplesRouter.post('/send', async (req: Request, res: Response) => {
  const u = await me(req); if (!u) { err(res, 'NOT_FOUND', 'User not found.', 404); return }
  const name = String(req.body?.name ?? '')
  const to = String(req.body?.to ?? '').trim().toLowerCase()
  if (to && !TEAM_ADDRESS.test(to)) { err(res, 'VALIDATION_ERROR', 'Samples can only be sent to your own address or a TRG Digital, Orrery or Crossways address.'); return }
  const fn = cases(u, to)[name]
  if (!fn) { err(res, 'VALIDATION_ERROR', 'Unknown sample.'); return }
  if (!allow(u.id)) { err(res, 'TOO_MANY', 'That is 40 samples in the last hour. Please try again later.', 429); return }
  try { await withForcedPerson(u.id, '[Sample] ', fn) } catch (e: any) { err(res, 'EMAIL_FAILED', String(e?.message ?? e).slice(0, 200), 502); return }
  ok(res, { sent: true, name, to: to || u.email })
})
