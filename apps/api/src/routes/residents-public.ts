// Public, unauthenticated endpoints for the family form (the emailed private link). Mounted before requireAuth.
// The unguessable token is the key: only its SHA-256 is stored. A dead link (unknown, revoked, expired, resident no longer living, or plan
// lapsed) always answers 410 with the same message, so a wrong guess learns nothing. Rate limited by publicLimiter (mounted on /public).
// Whatever a family member writes becomes a PENDING contribution: staff cannot see it until an admin approves it.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { siteUrl } from '../lib/urls'
import { SECTIONS, SECTION_KEYS, hashToken, cleanText, residentsEnabled, tablesReady } from '../lib/residents'
import { sendResidentFamilySubmissionEmail } from '../services/email/outbound'

export const publicFamilyRouter = Router()
const db = prisma as any
const DEAD = 'This link is no longer active. Please contact the home if you would still like to share something.'

async function liveInvite(token: string) {
  if (!token || token.length < 20 || token.length > 100) return null
  if (!(await tablesReady())) return null
  const inv = await db.residentInvite.findUnique({ where: { token_hash: hashToken(token) } })
  if (!inv || inv.revoked_at || inv.expires_at < new Date()) return null
  const resident = await db.resident.findFirst({ where: { id: inv.resident_id, tenant_id: inv.tenant_id } })
  if (!resident || resident.status !== 'living') return null
  if (!(await residentsEnabled(inv.tenant_id))) return null
  const tenant = await db.tenant.findUnique({ where: { id: inv.tenant_id }, select: { name: true } })
  return { inv, resident, homeName: tenant?.name ?? 'the home' }
}

publicFamilyRouter.get('/:token', async (req: Request, res: Response) => {
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  if (!live.inv.opened_at) await db.residentInvite.update({ where: { id: live.inv.id }, data: { opened_at: new Date() } }).catch(() => undefined)
  ok(res, {
    resident_name: live.resident.preferred_name || live.resident.first_name,
    home_name: live.homeName,
    invitee_name: live.inv.name,
    expires_at: live.inv.expires_at.toISOString(),
    already_submitted: !!live.inv.submitted_at,
    sections: SECTIONS,
  })
})

const SubmitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(60),
  answers: z.record(z.string(), z.string().max(4000)),
})

publicFamilyRouter.post('/:token', async (req: Request, res: Response) => {
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  if (live.inv.submitted_at) { err(res, 'ALREADY_SUBMITTED', 'Thank you, your answers have already been sent. The home can send you a new link if you would like to add more.', 409); return }
  const p = SubmitSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please add your name, how you know them, and at least one answer.', 400); return }
  const rows = Object.entries(p.data.answers)
    .filter(([k]) => SECTION_KEYS.has(k))
    .map(([k, v]) => [k, cleanText(v, 4000)] as const)
    .filter(([, v]) => v.length > 0)
  if (!rows.length) { err(res, 'VALIDATION_ERROR', 'Please answer at least one question.', 400); return }

  const name = cleanText(p.data.name, 100), relationship = cleanText(p.data.relationship, 60)
  await db.residentContribution.createMany({
    data: rows.map(([section_key, text]) => ({
      tenant_id: live.inv.tenant_id, resident_id: live.resident.id, invite_id: live.inv.id, contributor_name: name, relationship, section_key, text,
    })),
  })
  await db.residentInvite.update({ where: { id: live.inv.id }, data: { submitted_at: new Date() } })

  // Tell the admin who sent the invitation. A failed email must never lose the answers.
  try {
    const admin = live.inv.created_by ? await db.user.findUnique({ where: { email: live.inv.created_by }, select: { name: true, email: true } }) : null
    if (admin) {
      await sendResidentFamilySubmissionEmail({
        to: admin.email, adminName: admin.name, homeName: live.homeName, residentName: live.resident.preferred_name || live.resident.first_name,
        contributorName: name, relationship, count: rows.length, link: `${siteUrl()}/knowledge`,
      })
    }
  } catch (e) { console.error('[residents] submission email failed:', e) }

  ok(res, { submitted: rows.length }, 201)
})
