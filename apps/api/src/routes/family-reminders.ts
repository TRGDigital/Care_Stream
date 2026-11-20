// Family reminders.
//
//   Admin, mounted inside the residents router (so it sits behind requireAuth, requireAdmin and the plan and table gate):
//     GET /residents/:id/reminders              settings for every contact that has any, plus whether the table is ready
//     PUT /residents/:id/reminders/:inviteId    { cadence, weekday?, paused_until? } set, change, pause or switch off
//   Public, no sign in, mounted at /public/family/stop:
//     POST /public/family/stop/:token           the "Stop these reminders" link in each email (signed token, rate limited)
// The daily job itself is GET /cron/family-reminders (routes/cron.ts, CRON_SECRET bearer token).

import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { CADENCES, verifyStopToken } from '../lib/family-reminders-schedule'
import { remindersReady, listReminders, saveReminder, stopByFamily } from '../lib/family-reminders'

const db = prisma as any

// ─── Admin (mounted by routes/residents.ts) ────────────────────────────────────
export const residentRemindersRouter = Router({ mergeParams: true })

residentRemindersRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const resident = await db.resident.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
  if (!resident) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  const ready = await remindersReady()
  ok(res, { ready, reminders: ready ? await listReminders(tenantId, resident.id) : [] })
})

const DATE = /^\d{4}-\d{2}-\d{2}$/
const SaveSchema = z.object({
  cadence: z.enum(CADENCES),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  paused_until: z.union([z.string().regex(DATE), z.null()]).optional(),
})

residentRemindersRouter.put('/:inviteId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const p = SaveSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please choose how often, and a valid weekday and pause date.', 400); return }
  if (!(await remindersReady())) { err(res, 'NOT_READY', 'Reminders are being set up. Please try again shortly.', 503); return }
  const resident = await db.resident.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  const invite = resident ? await db.residentInvite.findFirst({ where: { id: String(req.params.inviteId), resident_id: resident.id, tenant_id: tenantId } }) : null
  if (!resident || !invite) { err(res, 'NOT_FOUND', 'Family contact not found.', 404); return }
  if (resident.status !== 'living') { err(res, 'ARCHIVED', 'You cannot set reminders for an archived profile.', 409); return }
  if (p.data.cadence !== 'off') {
    if (invite.revoked_at) { err(res, 'REVOKED', 'This invitation was cancelled, so no reminders can be sent.', 409); return }
    if (!invite.email) { err(res, 'NO_EMAIL', 'Reminders are sent by email. Add an invitation with an email address for this person first.', 409); return }
  }
  let pausedUntil: Date | null = null
  if (p.data.paused_until) {
    pausedUntil = new Date(`${p.data.paused_until}T00:00:00.000Z`)
    if (isNaN(+pausedUntil)) { err(res, 'VALIDATION_ERROR', 'That pause date is not valid.', 400); return }
  }
  const user = await db.user.findUnique({ where: { id: req.user!.sub }, select: { email: true } })
  const row = await saveReminder({ tenantId, residentId: resident.id, invite, input: { cadence: p.data.cadence, weekday: p.data.weekday ?? null, paused_until: pausedUntil }, by: user?.email ?? 'unknown' })
  void writeAuditLog({
    tenant_id: tenantId, user_id: req.user!.sub, event_type: 'resident_reminders_changed', entity_type: 'resident', entity_id: resident.id,
    metadata: { invite_id: invite.id, cadence: p.data.cadence, weekday: p.data.weekday ?? null, paused_until: p.data.paused_until ?? null },
  })
  const list = await listReminders(tenantId, resident.id)
  ok(res, { reminder: list.find((r: any) => r.invite_id === row.invite_id) ?? null })
})

// ─── Public: the stop link ─────────────────────────────────────────────────────
export const familyStopRouter = Router()

// Tighter than the general public limit: a handful of tries per IP is plenty for a person, and it blunts token guessing.
const stopLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false, keyGenerator: req => req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' } },
})

const GONE = 'This link is not working. Please contact the home if you would like to stop the reminders.'

// POST (not GET) so that a mail scanner opening the link in the email cannot switch reminders off by itself: the web page makes this call.
familyStopRouter.post('/:token', stopLimiter, async (req: Request, res: Response) => {
  const id = verifyStopToken(String(req.params.token))
  if (!id) { err(res, 'UNAVAILABLE', GONE, 410); return }
  try {
    const done = await stopByFamily(id)
    if (!done) { err(res, 'UNAVAILABLE', GONE, 410); return }
    ok(res, { stopped: true, ...done })
  } catch { err(res, 'UNAVAILABLE', GONE, 410) }
})
