// Owner-only: send ONE sample of a person-led staff email to a team address so the design can be reviewed in a real inbox.
// The sample uses a real admin as the person (so their real name, role and picture show), and fake staff details.
// Restricted to platform admins, and to a short list of our own domains so it can never be used to email anyone else.

import { Router, Request, Response } from 'express'
import { requirePlatformAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import * as out from '../services/email/outbound'
import { personEmailCases, personNoticeCases } from '../services/email/person-email-samples'
import { recordNotices } from '../services/staff-notices'

export const emailPreviewsAdminRouter = Router()
emailPreviewsAdminRouter.use(requirePlatformAdmin)

const ALLOWED_TO = /@(trgdigital\.co\.uk|orreryintelligence\.com|crosswayscarehome\.co\.uk)$/i

// POST /admin/email-previews/send  { name, to, actor_email }
emailPreviewsAdminRouter.post('/send', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '')
  const to = String(req.body?.to ?? '').trim()
  const actorEmail = String(req.body?.actor_email ?? '').trim().toLowerCase()
  if (!ALLOWED_TO.test(to)) { err(res, 'VALIDATION_ERROR', 'Test emails can only go to a TRG Digital, Orrery or Crossways address.'); return }
  const actor = await (prisma as any).user.findFirst({ where: { email: { equals: actorEmail, mode: 'insensitive' } }, select: { id: true, name: true, tenant_id: true } }).catch((e: any) => { console.error('[email-previews] actor lookup failed:', e?.message ?? e); return null })
  if (!actor) { err(res, 'NOT_FOUND', 'No user with that email, so there is no one to show as the sender.', 404); return }
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: actor.tenant_id }, select: { name: true } }).catch(() => null)
  const cases = personEmailCases(out, { to, name: 'Amira Khan', orgName: tenant?.name ?? 'Your care service', actorUserId: actor.id }, process.env.FRONTEND_URL ?? 'https://www.carestreamai.com')
  const fn = cases[name]
  if (!fn) { err(res, 'VALIDATION_ERROR', `Choose one of: ${Object.keys(cases).join(', ')}`); return }
  try { await fn() } catch (e: any) { err(res, 'EMAIL_FAILED', String(e?.message ?? e).slice(0, 200)); return }
  // Test only: with `with_notice` the same sample also appears as an overlay on the sender's own hub, so email click through can be tried.
  let notice = false
  if (req.body?.with_notice && personNoticeCases('x')[name]) {
    notice = (await recordNotices({ tenantId: actor.tenant_id, userIds: [actor.id], actorUserId: actor.id, kind: `sample_${name}`, allowSelf: true, build: adminName => personNoticeCases(adminName)[name] })) > 0
  }
  ok(res, { sent: true, name, to, sender: actor.name, notice })
})

// POST /admin/email-previews/notice  { name, user_email, actor_email }
// Creates a sample hub overlay for a real (team) user, from the same sample cases as the emails, so the overlay can be tested end to
// end without allocating anything. Both people must be users with a TRG Digital, Orrery or Crossways address.
emailPreviewsAdminRouter.post('/notice', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '')
  const userEmail = String(req.body?.user_email ?? '').trim().toLowerCase()
  const actorEmail = String(req.body?.actor_email ?? '').trim().toLowerCase()
  if (!ALLOWED_TO.test(userEmail) || !ALLOWED_TO.test(actorEmail)) { err(res, 'VALIDATION_ERROR', 'Both people must have a TRG Digital, Orrery or Crossways email address.'); return }
  const find = (email: string) => (prisma as any).user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, name: true, tenant_id: true } }).catch((e: any) => { console.error('[email-previews] user lookup failed:', e?.message ?? e); return null })
  const [recipient, actor] = await Promise.all([find(userEmail), find(actorEmail)])
  if (!recipient || !actor) { err(res, 'NOT_FOUND', 'No user with one of those emails.', 404); return }
  const cases = personNoticeCases('x')
  if (!cases[name]) { err(res, 'VALIDATION_ERROR', `Choose one of: ${Object.keys(cases).join(', ')}`); return }
  const made = await recordNotices({ tenantId: recipient.tenant_id, userIds: [recipient.id], actorUserId: actor.id, kind: `sample_${name}`, allowSelf: true, build: adminName => personNoticeCases(adminName)[name] })
  if (!made) { err(res, 'NOTICE_FAILED', 'The notice was not created. The staff_notices table may not have been created yet.', 503); return }
  ok(res, { created: true, name, user: recipient.name, sender: actor.name })
})
