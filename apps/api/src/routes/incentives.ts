// Staff incentives (Professional and Enterprise). Mounted at /incentives after requireAuth. See lib and services/incentives for the rules.
//
//   GET  /meta                                   events, who can do what
//   GET  /me                                     a person's own campaigns, points and rewards (any signed in user; never anyone else's)
//   GET  /queue                                  care manager: incentives waiting to go live and rewards waiting for approval
//   POST /campaigns/:id/approve | /reject        care manager
//   POST /claims/:id/approve | /reject           care manager
//   POST /claims/:id/given                       care manager or admin: the reward has been handed over
//   GET/POST /campaigns, GET/PUT/DELETE /campaigns/:id, POST /submit | /cancel, GET /export, GET /staff/:userId     admin
//
// CareStream records and reports. It never buys vouchers or moves money.

import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { siteUrl } from '../lib/urls'
import { residentsEnabled } from '../lib/residents'
import { EVENTS, EVENT_KEYS, periodFor, currentMonth, pct } from '../services/incentives/logic'
import { evaluateCampaign, campaignPeople, targetFor } from '../services/incentives/engine'
import { sendIncentiveEmail } from '../services/email/outbound'
import { notifyLaunch } from '../services/incentives/notify'
import { launchMail, pointsMail, winnerMail, thanksMail } from '../services/incentives/content'

export const incentivesRouter = Router()
const db = prisma as any

// Same plan rule as resident profiles (Professional and Enterprise). If the plans change, change it here and in lib/residents.ts.
const incentivesEnabled = (tenantId: string) => residentsEnabled(tenantId)
async function tablesReady(): Promise<boolean> {
  try { await db.incentiveCampaign.findFirst({ select: { id: true } }); return true } catch { return false }
}
const MAX_IMAGE_CHARS = 200_000

async function actor(req: Request) {
  const u = await db.user.findUnique({ where: { id: req.user!.sub }, select: { id: true, name: true, email: true, job_role: true, role: true } })
  return { id: req.user!.sub, name: u?.name ?? 'Someone', email: u?.email ?? 'unknown', job_role: u?.job_role ?? '', role: u?.role ?? req.user!.role }
}
const isManagerRole = (job_role: string | null | undefined) => /care manager|registered manager/i.test(String(job_role ?? ''))

async function managers(tenantId: string) {
  const rows = await db.user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, name: true, email: true, job_role: true } })
  return (rows as any[]).filter(u => u.email && isManagerRole(u.job_role))
}

async function gate(_req: Request, res: Response, next: NextFunction) {
  const tenantId = getTenantId()
  if (!(await incentivesEnabled(tenantId))) { err(res, 'FEATURE_NOT_AVAILABLE', 'Staff incentives are on the Professional and Enterprise plans. Upgrade to use them.', 403); return }
  if (!(await tablesReady())) { err(res, 'NOT_READY', 'Staff incentives are being set up. Please try again shortly.', 503); return }
  next()
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const ruleDto = (r: any) => ({ id: r.id, event: r.event, points: r.points, max_per_month: r.max_per_month ?? null })
const rewardDto = (r: any) => ({ id: r.id, key: r.key, title: r.title, image_data: r.image_data ?? null, target_points: r.target_points, quantity: r.quantity ?? null, value_pence: r.value_pence ?? null })

async function claimCounts(campaignIds: string[]) {
  const map = new Map<string, { held: number; approved: number; given: number; missed: number }>()
  if (!campaignIds.length) return map
  const rows = await db.incentiveClaim.groupBy({ by: ['campaign_id', 'status'], where: { campaign_id: { in: campaignIds } }, _count: { _all: true } })
  for (const r of rows as any[]) {
    const m = map.get(r.campaign_id) ?? { held: 0, approved: 0, given: 0, missed: 0 }
    if (r.status in m) (m as any)[r.status] = r._count._all
    map.set(r.campaign_id, m)
  }
  return map
}

async function summaries(tenantId: string, campaigns: any[]) {
  const ids = campaigns.map(c => c.id)
  const [counts, rewards, parts] = await Promise.all([
    claimCounts(ids),
    db.incentiveReward.findMany({ where: { campaign_id: { in: ids } }, select: { campaign_id: true, title: true, position: true }, orderBy: { position: 'asc' } }),
    db.incentiveParticipant.groupBy({ by: ['campaign_id'], where: { campaign_id: { in: ids } }, _count: { _all: true } }),
  ])
  const titles = new Map<string, string[]>()
  for (const r of rewards as any[]) titles.set(r.campaign_id, [...(titles.get(r.campaign_id) ?? []), r.title])
  const pc = new Map<string, number>((parts as any[]).map(r => [r.campaign_id, r._count._all]))
  const everyoneCount = campaigns.some(c => c.everyone)
    ? await db.user.count({ where: { tenant_id: tenantId, is_active: true, is_agency: false, is_reviewer: false } })
    : 0
  return campaigns.map(c => ({
    id: c.id, name: c.name, month: c.month, status: c.status, everyone: c.everyone,
    participants_count: c.everyone ? Math.max(everyoneCount, pc.get(c.id) ?? 0) : (pc.get(c.id) ?? 0),
    rewards_count: (titles.get(c.id) ?? []).length, reward_titles: titles.get(c.id) ?? [],
    claims: counts.get(c.id) ?? { held: 0, approved: 0, given: 0, missed: 0 },
    created_by_name: c.created_by_name ?? null, approved_by_name: c.approved_by_name ?? null, approved_at: iso(c.approved_at), rejected_reason: c.rejected_reason ?? null,
  }))
}

async function detail(tenantId: string, c: any) {
  const [rules, rewards, parts, sum] = await Promise.all([
    db.incentiveRule.findMany({ where: { campaign_id: c.id } }),
    db.incentiveReward.findMany({ where: { campaign_id: c.id }, orderBy: { position: 'asc' } }),
    db.incentiveParticipant.findMany({ where: { campaign_id: c.id } }),
    summaries(tenantId, [c]),
  ])
  const users = parts.length ? await db.user.findMany({ where: { id: { in: parts.map((p: any) => p.user_id) } }, select: { id: true, name: true, job_role: true } }) : []
  const byId = new Map<string, any>(users.map((u: any) => [u.id, u]))
  return {
    ...sum[0],
    period_start: iso(c.period_start), period_end: iso(c.period_end), submitted_at: iso(c.submitted_at),
    rules: rules.map(ruleDto), rewards: rewards.map(rewardDto),
    participants: parts.map((p: any) => ({ user_id: p.user_id, name: byId.get(p.user_id)?.name, job_role: byId.get(p.user_id)?.job_role ?? null, targets: p.targets ?? {} })),
  }
}

async function claimDtos(tenantId: string, claims: any[]) {
  if (!claims.length) return []
  const [camps, rewards, users] = await Promise.all([
    db.incentiveCampaign.findMany({ where: { id: { in: Array.from(new Set(claims.map(c => c.campaign_id))) } }, select: { id: true, name: true } }),
    db.incentiveReward.findMany({ where: { id: { in: Array.from(new Set(claims.map(c => c.reward_id))) } } }),
    db.user.findMany({ where: { id: { in: Array.from(new Set(claims.map(c => c.user_id))) } }, select: { id: true, name: true } }),
  ])
  const cm = new Map<string, any>(camps.map((c: any) => [c.id, c])), rm = new Map<string, any>(rewards.map((r: any) => [r.id, r])), um = new Map<string, any>(users.map((u: any) => [u.id, u]))
  return claims.map(c => ({
    id: c.id, campaign_id: c.campaign_id, campaign_name: cm.get(c.campaign_id)?.name ?? '', reward_key: rm.get(c.reward_id)?.key ?? '', reward_title: rm.get(c.reward_id)?.title ?? '',
    reward_image_data: rm.get(c.reward_id)?.image_data ?? null, value_pence: rm.get(c.reward_id)?.value_pence ?? null,
    user_id: c.user_id, user_name: um.get(c.user_id)?.name ?? 'Former colleague', status: c.status, rank: c.rank ?? null, tied: !!c.tied, reached_at: iso(c.reached_at),
    decided_by_name: c.decided_by_name ?? null, decided_at: iso(c.decided_at), reject_reason: c.reject_reason ?? null, given_by_name: c.given_by_name ?? null, given_at: iso(c.given_at),
  }))
}

// ─── Meta ──────────────────────────────────────────────────────────────────────
incentivesRouter.get('/meta', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const enabled = (await incentivesEnabled(tenantId)) && (await tablesReady())
  const me = await actor(req)
  ok(res, { enabled, events: EVENTS, is_admin: me.role === 'admin', is_manager: enabled && isManagerRole(me.job_role), max_image_bytes: MAX_IMAGE_CHARS })
})

// ─── A person's own view ───────────────────────────────────────────────────────
incentivesRouter.get('/me', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = req.user!.sub
  if (!(await incentivesEnabled(tenantId)) || !(await tablesReady())) { ok(res, { enabled: false, campaigns: [], outstanding_training: 0 }); return }
  const campaigns = await db.incentiveCampaign.findMany({ where: { tenant_id: tenantId, status: { in: ['live', 'ended'] } }, orderBy: { month: 'desc' }, take: 24 })
  const mine: any[] = []
  let outstanding = 0
  for (const c of campaigns as any[]) {
    await evaluateCampaign(tenantId, c.id).catch(e => console.error('[incentives] evaluate', e))
    const parts = await db.incentiveParticipant.findMany({ where: { campaign_id: c.id } })
    const people = await campaignPeople(tenantId, c, parts)
    if (!people.some(p => p.id === userId && p.is_active)) continue
    const [rewards, ledger, claims, allClaims] = await Promise.all([
      db.incentiveReward.findMany({ where: { campaign_id: c.id }, orderBy: { position: 'asc' } }),
      db.incentiveLedger.findMany({ where: { campaign_id: c.id, user_id: userId }, orderBy: { occurred_at: 'desc' } }),
      db.incentiveClaim.findMany({ where: { campaign_id: c.id, user_id: userId } }),
      db.incentiveClaim.findMany({ where: { campaign_id: c.id, status: { in: ['held', 'approved', 'given'] } }, select: { reward_id: true } }),
    ])
    const points = (ledger as any[]).reduce((n, l) => n + l.points, 0)
    const taken = new Map<string, number>()
    for (const a of allClaims as any[]) taken.set(a.reward_id, (taken.get(a.reward_id) ?? 0) + 1)
    mine.push({
      id: c.id, name: c.name, month: c.month, status: c.status, points,
      rewards: (rewards as any[]).map(r => {
        const target = targetFor(r, parts, userId)
        const claim = (claims as any[]).find(x => x.reward_id === r.id && x.status !== 'forfeited') ?? null
        const left = r.quantity === null ? null : Math.max(0, r.quantity - (taken.get(r.id) ?? 0))
        const missed = claim?.status === 'missed' || (!claim && c.status === 'ended' && r.quantity !== null && left === 0)
        return {
          key: r.key, title: r.title, image_data: r.image_data ?? null, target_points: target, points, pct: pct(points, target),
          places_total: r.quantity ?? null, places_left: left,
          claim: claim ? { status: claim.status, rank: claim.rank ?? null, reached_at: iso(claim.reached_at) } : null,
          thank_you: missed ? `Thank you for the effort you put in this month. The places for this reward went to colleagues who finished first, and you earned ${points} point${points === 1 ? '' : 's'}. Keeping your training up to date makes a real difference to the people we support, and there will be more chances to earn.` : null,
        }
      }),
      entries: (ledger as any[]).map(l => ({ at: iso(l.occurred_at), label: l.label, points: l.points })),
    })
  }
  if (mine.length) outstanding = await db.trainingEnrollment.count({ where: { tenant_id: tenantId, user_id: userId, status: { in: ['not_started', 'in_progress'] } } }).catch(() => 0)
  ok(res, { enabled: true, campaigns: mine, outstanding_training: outstanding })
})

// ─── Care manager ──────────────────────────────────────────────────────────────
incentivesRouter.get('/queue', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const me = await actor(req)
  const off = { is_manager: false, campaigns: [], claims: [], count: 0 }
  if (!(await incentivesEnabled(tenantId)) || !(await tablesReady()) || !isManagerRole(me.job_role)) { ok(res, off); return }
  const waiting = await db.incentiveCampaign.findMany({ where: { tenant_id: tenantId, status: 'awaiting_approval' }, orderBy: { submitted_at: 'asc' } })
  const open = await db.incentiveClaim.findMany({ where: { tenant_id: tenantId, status: { in: ['held', 'approved'] } }, orderBy: [{ campaign_id: 'asc' }, { reached_at: 'asc' }] })
  const campaigns = await Promise.all((waiting as any[]).map(c => detail(tenantId, c)))
  ok(res, { is_manager: true, campaigns, claims: await claimDtos(tenantId, open), count: waiting.length + (open as any[]).filter(c => c.status === 'held').length })
})

incentivesRouter.use(gate)

function requireManager(req: Request, res: Response, next: NextFunction) {
  actor(req).then(me => {
    if (!isManagerRole(me.job_role)) { err(res, 'FORBIDDEN', 'Only a care manager can do this.', 403); return }
    next()
  }).catch(() => err(res, 'INTERNAL', 'Could not check your role.', 500))
}

async function notifyCreator(tenantId: string, campaign: any, subject: string, heading: string, body: string) {
  try {
    if (!campaign.created_by) return
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    await sendIncentiveEmail({ to: [campaign.created_by], subject, heading, body, buttonLabel: 'Open incentives', link: `${siteUrl()}/incentives`, orgName: tenant?.name ?? 'your home' })
  } catch (e) { console.error('[incentives] creator email failed', e) }
}

incentivesRouter.post('/campaigns/:id/approve', requireManager, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await db.incentiveCampaign.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (c.status !== 'awaiting_approval') { err(res, 'CONFLICT', 'This incentive is not waiting for approval.', 409); return }
  const me = await actor(req)
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { status: 'live', approved_by: me.email, approved_by_name: me.name, approved_at: new Date(), rejected_reason: null, last_evaluated_at: null } })
  await evaluateCampaign(tenantId, c.id, { force: true }).catch(e => console.error('[incentives] evaluate', e))
  void notifyLaunch(tenantId, c.id).catch(e => console.error('[incentives] launch email failed', e))
  void notifyCreator(tenantId, c, `Approved: ${c.name}`, 'Your incentive is live', `${me.name} approved "${c.name}". Staff can see it in the hub now.`)
  ok(res, await detail(tenantId, upd))
})

incentivesRouter.post('/campaigns/:id/reject', requireManager, async (req: Request, res: Response) => {
  const reason = z.string().trim().min(3).max(500).safeParse(req.body?.reason)
  if (!reason.success) { err(res, 'VALIDATION_ERROR', 'Please say why, so the person who made it knows what to change.'); return }
  const tenantId = getTenantId()
  const c = await db.incentiveCampaign.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (c.status !== 'awaiting_approval') { err(res, 'CONFLICT', 'This incentive is not waiting for approval.', 409); return }
  const me = await actor(req)
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { status: 'rejected', rejected_reason: reason.data } })
  void notifyCreator(tenantId, c, `Needs changes: ${c.name}`, 'Your incentive needs changes', `${me.name} did not approve "${c.name}": ${reason.data}`)
  ok(res, await detail(tenantId, upd))
})

async function loadClaim(tenantId: string, id: string) {
  return db.incentiveClaim.findFirst({ where: { id, tenant_id: tenantId } })
}

incentivesRouter.post('/claims/:id/approve', requireManager, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await loadClaim(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Reward not found.', 404); return }
  if (c.status !== 'held') { err(res, 'CONFLICT', 'This reward is not waiting for approval.', 409); return }
  const me = await actor(req)
  const upd = await db.incentiveClaim.update({ where: { id: c.id }, data: { status: 'approved', decided_by: me.email, decided_by_name: me.name, decided_at: new Date() } })
  ok(res, (await claimDtos(tenantId, [upd]))[0])
})

incentivesRouter.post('/claims/:id/reject', requireManager, async (req: Request, res: Response) => {
  const reason = z.string().trim().min(3).max(500).safeParse(req.body?.reason)
  if (!reason.success) { err(res, 'VALIDATION_ERROR', 'Please say why.'); return }
  const tenantId = getTenantId()
  const c = await loadClaim(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Reward not found.', 404); return }
  if (!['held', 'approved'].includes(c.status)) { err(res, 'CONFLICT', 'This reward cannot be rejected now.', 409); return }
  const me = await actor(req)
  const upd = await db.incentiveClaim.update({ where: { id: c.id }, data: { status: 'rejected', rank: null, tied: false, decided_by: me.email, decided_by_name: me.name, decided_at: new Date(), reject_reason: reason.data } })
  await evaluateCampaign(tenantId, c.campaign_id, { force: true }).catch(e => console.error('[incentives] evaluate', e))   // the place passes to the next person
  ok(res, (await claimDtos(tenantId, [upd]))[0])
})

incentivesRouter.post('/claims/:id/given', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const me = await actor(req)
  if (me.role !== 'admin' && !isManagerRole(me.job_role)) { err(res, 'FORBIDDEN', 'Only an admin or a care manager can do this.', 403); return }
  const c = await loadClaim(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Reward not found.', 404); return }
  if (c.status !== 'approved') { err(res, 'CONFLICT', 'A care manager needs to approve this reward first.', 409); return }
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : null
  const upd = await db.incentiveClaim.update({ where: { id: c.id }, data: { status: 'given', given_by: me.email, given_by_name: me.name, given_at: new Date(), note } })
  ok(res, (await claimDtos(tenantId, [upd]))[0])
})

// ─── Admin: build and run campaigns ────────────────────────────────────────────
incentivesRouter.use(requireAdmin)

const IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/
const CampaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  everyone: z.boolean(),
  participants: z.array(z.object({ user_id: z.string().min(1), targets: z.record(z.string(), z.number().int().min(1).max(100000)).optional() })).max(500),
  rules: z.array(z.object({ event: z.string(), points: z.number().int().min(1).max(1000), max_per_month: z.number().int().min(1).max(100).nullable().optional() })).min(1).max(10),
  rewards: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z0-9_-]{1,20}$/),
    title: z.string().trim().min(1).max(120),
    image_data: z.string().max(MAX_IMAGE_CHARS).regex(IMAGE).nullable().optional(),
    target_points: z.number().int().min(1).max(100000),
    quantity: z.number().int().min(1).max(1000).nullable().optional(),
    value_pence: z.number().int().min(0).max(1_000_000).nullable().optional(),
  })).min(1).max(8),
})

async function validateAndShape(tenantId: string, body: unknown): Promise<{ ok: true; data: z.infer<typeof CampaignSchema>; period: { start: Date; end: Date } } | { ok: false; message: string }> {
  const p = CampaignSchema.safeParse(body)
  if (!p.success) return { ok: false, message: p.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') }
  const d = p.data
  const period = periodFor(d.month)
  if (!period) return { ok: false, message: 'Choose a valid month.' }
  if (d.month < currentMonth()) return { ok: false, message: 'Choose this month or a later one.' }
  const events = d.rules.map(r => r.event)
  if (events.some(e => !EVENT_KEYS.has(e))) return { ok: false, message: 'One of the rules is not recognised.' }
  if (new Set(events).size !== events.length) return { ok: false, message: 'Each way of earning points can only be added once.' }
  if (new Set(d.rewards.map(r => r.key)).size !== d.rewards.length) return { ok: false, message: 'Each reward needs its own key.' }
  if (!d.everyone && d.participants.length === 0) return { ok: false, message: 'Choose at least one member of staff, or switch on Everyone.' }
  const ids = Array.from(new Set(d.participants.map(x => x.user_id)))
  if (ids.length) {
    const found = await db.user.count({ where: { tenant_id: tenantId, id: { in: ids } } })
    if (found !== ids.length) return { ok: false, message: 'One of the chosen staff is not in your home.' }
  }
  const keys = new Set(d.rewards.map(r => r.key))
  for (const part of d.participants) for (const k of Object.keys(part.targets ?? {})) if (!keys.has(k)) return { ok: false, message: 'A personal target refers to a reward that does not exist.' }
  return { ok: true, data: d, period }
}

async function writeChildren(tenantId: string, campaignId: string, d: z.infer<typeof CampaignSchema>) {
  await db.incentiveRule.createMany({ data: d.rules.map(r => ({ tenant_id: tenantId, campaign_id: campaignId, event: r.event, points: r.points, max_per_month: r.max_per_month ?? null })) })
  await db.incentiveReward.createMany({ data: d.rewards.map((r, i) => ({ tenant_id: tenantId, campaign_id: campaignId, key: r.key, title: r.title, image_data: r.image_data ?? null, target_points: r.target_points, quantity: r.quantity ?? null, value_pence: r.value_pence ?? null, position: i })) })
  const seen = new Set<string>()
  const parts = d.participants.filter(p => (seen.has(p.user_id) ? false : (seen.add(p.user_id), true)))
  if (parts.length) await db.incentiveParticipant.createMany({ data: parts.map(p => ({ tenant_id: tenantId, campaign_id: campaignId, user_id: p.user_id, targets: p.targets ?? {} })) })
}

incentivesRouter.get('/campaigns', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const rows = await db.incentiveCampaign.findMany({ where: { tenant_id: tenantId }, orderBy: [{ month: 'desc' }, { created_at: 'desc' }], take: 200 })
  for (const c of rows as any[]) if (c.status === 'live') await evaluateCampaign(tenantId, c.id).catch(e => console.error('[incentives] evaluate', e))
  ok(res, { campaigns: await summaries(tenantId, rows) })
})

incentivesRouter.post('/campaigns', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const v = await validateAndShape(tenantId, req.body)
  if (!v.ok) { err(res, 'VALIDATION_ERROR', v.message); return }
  const me = await actor(req)
  const c = await db.incentiveCampaign.create({
    data: { tenant_id: tenantId, name: v.data.name, month: v.data.month, period_start: v.period.start, period_end: v.period.end, everyone: v.data.everyone, status: 'draft', created_by: me.email, created_by_name: me.name },
  })
  await writeChildren(tenantId, c.id, v.data)
  ok(res, await detail(tenantId, c), 201)
})

async function editable(tenantId: string, id: string) {
  const c = await db.incentiveCampaign.findFirst({ where: { id, tenant_id: tenantId } })
  return c
}

incentivesRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  await evaluateCampaign(tenantId, c.id).catch(e => console.error('[incentives] evaluate', e))
  const fresh = await editable(tenantId, c.id)
  const [d, rewards, parts, ledger, claims] = await Promise.all([
    detail(tenantId, fresh),
    db.incentiveReward.findMany({ where: { campaign_id: c.id }, orderBy: { position: 'asc' } }),
    db.incentiveParticipant.findMany({ where: { campaign_id: c.id } }),
    db.incentiveLedger.findMany({ where: { campaign_id: c.id }, select: { user_id: true, points: true } }),
    db.incentiveClaim.findMany({ where: { campaign_id: c.id }, orderBy: [{ reward_id: 'asc' }, { rank: 'asc' }] }),
  ])
  const people = (['live', 'ended'].includes(fresh.status)) ? await campaignPeople(tenantId, fresh, parts) : []
  const totals = new Map<string, number>()
  for (const l of ledger as any[]) totals.set(l.user_id, (totals.get(l.user_id) ?? 0) + l.points)
  const progress = people.filter(p => p.is_active).map(p => {
    const points = totals.get(p.id) ?? 0
    return {
      user_id: p.id, name: p.name, job_role: p.job_role, points,
      rewards: (rewards as any[]).map(r => {
        const target = targetFor(r, parts, p.id)
        const claim = (claims as any[]).find(x => x.reward_id === r.id && x.user_id === p.id)
        return { key: r.key, target, pct: pct(points, target), claim: claim?.status ?? null, reached_at: iso(claim?.reached_at) }
      }),
    }
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
  ok(res, { campaign: d, progress, claims: await claimDtos(tenantId, claims) })
})

incentivesRouter.put('/campaigns/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (!['draft', 'rejected'].includes(c.status)) { err(res, 'CONFLICT', 'Only a draft or a rejected incentive can be edited.', 409); return }
  const v = await validateAndShape(tenantId, req.body)
  if (!v.ok) { err(res, 'VALIDATION_ERROR', v.message); return }
  await db.incentiveRule.deleteMany({ where: { campaign_id: c.id } })
  await db.incentiveReward.deleteMany({ where: { campaign_id: c.id } })
  await db.incentiveParticipant.deleteMany({ where: { campaign_id: c.id } })
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { name: v.data.name, month: v.data.month, period_start: v.period.start, period_end: v.period.end, everyone: v.data.everyone } })
  await writeChildren(tenantId, c.id, v.data)
  ok(res, await detail(tenantId, upd))
})

// Rename at any time (a live incentive cannot otherwise be edited).
incentivesRouter.patch('/campaigns/:id', async (req: Request, res: Response) => {
  const name = z.string().trim().min(1).max(100).safeParse(req.body?.name)
  if (!name.success) { err(res, 'VALIDATION_ERROR', 'Enter a name up to 100 characters.'); return }
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { name: name.data } })
  ok(res, await detail(tenantId, upd))
})

incentivesRouter.post('/campaigns/:id/submit', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (!['draft', 'rejected'].includes(c.status)) { err(res, 'CONFLICT', 'This incentive has already been submitted.', 409); return }
  const mgrs = await managers(tenantId)
  if (!mgrs.length) { err(res, 'NO_MANAGER', 'There is no care manager to approve it yet. Give a staff member the job role Care Manager or Registered Manager first.', 409); return }
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { status: 'awaiting_approval', submitted_at: new Date(), rejected_reason: null } })
  try {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    await sendIncentiveEmail({
      to: mgrs.map((m: any) => m.email), subject: `Please review an incentive: ${c.name}`, heading: 'An incentive is waiting for your approval',
      body: `${c.created_by_name ?? 'An admin'} has set up "${c.name}" for ${c.month}. It only goes live when a care manager approves it. You can review it in the hub under Incentive approvals.`,
      buttonLabel: 'Open the hub', link: `${siteUrl()}/chat`, orgName: tenant?.name ?? 'your home',
    })
  } catch (e) { console.error('[incentives] manager email failed', e) }
  ok(res, await detail(tenantId, upd))
})

incentivesRouter.post('/campaigns/:id/cancel', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (!['draft', 'awaiting_approval', 'live', 'rejected'].includes(c.status)) { err(res, 'CONFLICT', 'This incentive cannot be cancelled now.', 409); return }
  const upd = await db.incentiveCampaign.update({ where: { id: c.id }, data: { status: 'cancelled' } })
  ok(res, await detail(tenantId, upd))
})

incentivesRouter.delete('/campaigns/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  if (!['draft', 'rejected', 'cancelled'].includes(c.status) || (await db.incentiveLedger.count({ where: { campaign_id: c.id } })) > 0) { err(res, 'CONFLICT', 'Only an incentive that has not run can be deleted.', 409); return }
  for (const m of ['incentiveRule', 'incentiveReward', 'incentiveParticipant', 'incentiveClaim']) await db[m].deleteMany({ where: { campaign_id: c.id } })
  await db.incentiveCampaign.delete({ where: { id: c.id } })
  ok(res, { deleted: true })
})

const csv = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

incentivesRouter.get('/campaigns/:id/export', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const c = await editable(tenantId, String(req.params.id))
  if (!c) { err(res, 'NOT_FOUND', 'Incentive not found.', 404); return }
  const claims = await db.incentiveClaim.findMany({ where: { campaign_id: c.id }, orderBy: [{ reward_id: 'asc' }, { rank: 'asc' }] })
  const dtos = await claimDtos(tenantId, claims)
  const head = ['Incentive', 'Month', 'Person', 'Reward', 'Place', 'Status', 'Reached', 'Approved by', 'Given by', 'Given on', 'Value (GBP)']
  const rows = dtos.map(d => [c.name, c.month, d.user_name, d.reward_title, d.rank ?? '', d.status, d.reached_at ?? '', d.decided_by_name ?? '', d.given_by_name ?? '', d.given_at ?? '', d.value_pence != null ? (d.value_pence / 100).toFixed(2) : ''])
  const safe = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'incentive'
  ok(res, { filename: `incentives-${c.month}-${safe}.csv`, text: [head, ...rows].map(r => r.map(csv).join(',')).join('\n') })
})

// One person's full history, per month and per award, for the staff record page.
incentivesRouter.get('/staff/:userId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const u = await db.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } })
  if (!u) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const [ledger, claims, partRows] = await Promise.all([
    db.incentiveLedger.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { occurred_at: 'desc' } }),
    db.incentiveClaim.findMany({ where: { tenant_id: tenantId, user_id: userId } }),
    db.incentiveParticipant.findMany({ where: { tenant_id: tenantId, user_id: userId } }),
  ])
  // Every live or ended campaign this person is part of (even with no points yet), plus any that hold their points or claims.
  const recent = await db.incentiveCampaign.findMany({ where: { tenant_id: tenantId, status: { in: ['live', 'ended'] } }, orderBy: { month: 'desc' }, take: 36 })
  const camps: any[] = []
  for (const c of recent as any[]) {
    const parts = await db.incentiveParticipant.findMany({ where: { campaign_id: c.id } })
    const people = await campaignPeople(tenantId, c, parts)
    const has = (ledger as any[]).some(l => l.campaign_id === c.id) || (claims as any[]).some(x => x.campaign_id === c.id)
    if (has || people.some(p => p.id === userId)) camps.push(c)
  }
  if (!camps.length) { ok(res, { months: [] }); return }
  const rewards = await db.incentiveReward.findMany({ where: { campaign_id: { in: camps.map(c => c.id) } }, orderBy: { position: 'asc' } })
  const byMonth = new Map<string, any[]>()
  for (const c of camps) {
    const cl = (claims as any[]).filter(x => x.campaign_id === c.id)
    const entries = (ledger as any[]).filter(l => l.campaign_id === c.id)
    const part = (partRows as any[]).filter(p => p.campaign_id === c.id)
    byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), {
      id: c.id, name: c.name, status: c.status, points: entries.reduce((n, l) => n + l.points, 0),
      rewards: (rewards as any[]).filter(r => r.campaign_id === c.id).map(r => ({ title: r.title, target: targetFor(r, part, userId), claim: cl.find(x => x.reward_id === r.id)?.status ?? null })),
      entries: entries.map(l => ({ at: iso(l.occurred_at), label: l.label, points: l.points })),
    }])
  }
  ok(res, { months: Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, campaigns]) => ({ month, campaigns })) })
})


// ─── Dashboard summary and the optional monthly budget ────────────────────────
const monthRange = (offset: number) => {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1) - 1)
  return { start, end }
}

async function budgetPence(tenantId: string): Promise<number | null> {
  try { return (await db.incentiveSetting.findUnique({ where: { tenant_id: tenantId } }))?.monthly_budget_pence ?? null } catch { return null }
}

incentivesRouter.get('/summary', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const month = currentMonth()
  const camps = await db.incentiveCampaign.findMany({ where: { tenant_id: tenantId, month, status: { in: ['live', 'ended'] } }, orderBy: { created_at: 'asc' } })
  for (const c of camps as any[]) if (c.status === 'live') await evaluateCampaign(tenantId, c.id).catch(() => {})
  const ids = (camps as any[]).map(c => c.id)
  const [claims, rewards, ledger, participants] = ids.length ? await Promise.all([
    db.incentiveClaim.findMany({ where: { campaign_id: { in: ids }, status: { in: ['held', 'approved', 'given'] } } }),
    db.incentiveReward.findMany({ where: { campaign_id: { in: ids } } }),
    db.incentiveLedger.findMany({ where: { campaign_id: { in: ids } }, select: { campaign_id: true, user_id: true, points: true } }),
    db.incentiveParticipant.findMany({ where: { campaign_id: { in: ids } } }),
  ]) : [[], [], [], []]
  const valueOf = (rewardId: string) => (rewards as any[]).find(r => r.id === rewardId)?.value_pence ?? 0
  const sum = (status: string[]) => (claims as any[]).filter(c => status.includes(c.status)).reduce((n, c) => n + valueOf(c.reward_id), 0)
  let people = 0
  const earners = new Set<string>()
  for (const c of camps as any[]) {
    const ps = (participants as any[]).filter(p => p.campaign_id === c.id)
    people += (await campaignPeople(tenantId, c, ps)).filter(p => p.is_active).length
  }
  for (const l of ledger as any[]) earners.add(`${l.campaign_id}:${l.user_id}`)
  const doneIn = (r: { start: Date; end: Date }) => db.trainingEnrollment.count({ where: { tenant_id: tenantId, status: 'complete', completed_at: { gte: r.start, lte: r.end } } }).catch(() => 0)
  const [thisMonth, lastMonth] = await Promise.all([doneIn(monthRange(0)), doneIn(monthRange(-1))])
  ok(res, {
    month,
    campaigns: (camps as any[]).map(c => ({ id: c.id, name: c.name, status: c.status })),
    people, earners: earners.size, points: (ledger as any[]).reduce((n, l) => n + l.points, 0),
    rewards: { reached: (claims as any[]).length, waiting: (claims as any[]).filter(c => c.status === 'held').length, given: (claims as any[]).filter(c => c.status === 'given').length },
    value_pence: { approved_or_given: sum(['approved', 'given']), waiting: sum(['held']) },
    budget_pence: await budgetPence(tenantId),
    training: { this_month: thisMonth, last_month: lastMonth },
  })
})

incentivesRouter.put('/settings', async (req: Request, res: Response) => {
  const p = z.object({ monthly_budget_pence: z.number().int().min(0).max(100_000_000).nullable() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Enter a budget in pounds, or leave it empty for none.'); return }
  const tenantId = getTenantId()
  try {
    await db.incentiveSetting.upsert({ where: { tenant_id: tenantId }, create: { tenant_id: tenantId, monthly_budget_pence: p.data.monthly_budget_pence }, update: { monthly_budget_pence: p.data.monthly_budget_pence } })
  } catch { err(res, 'NOT_READY', 'The budget can be saved once the latest database update has been run.', 503); return }
  ok(res, { monthly_budget_pence: p.data.monthly_budget_pence })
})


// An admin can send the four staff emails, with sample figures, to a member of their own home to check the wording.
incentivesRouter.post('/preview-emails', async (req: Request, res: Response) => {
  const p = z.object({ to: z.string().email() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Enter an email address.'); return }
  const tenantId = getTenantId()
  const member = await db.user.findFirst({ where: { tenant_id: tenantId, is_active: true, email: { equals: p.data.to, mode: 'insensitive' } }, select: { email: true } })
  if (!member) { err(res, 'FORBIDDEN', 'You can only send a preview to someone in your own home.', 403); return }
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const org = tenant?.name ?? 'your home'
  const mails = [
    launchMail({ name: 'Training champions', month: currentMonth(), rules: [{ event: 'training_completed', points: 10 }, { event: 'training_on_time', points: 5 }, { event: 'cpd_completed', points: 15 }, { event: 'onboarding_completed', points: 25 }, { event: 'practical_signed', points: 10 }], rewards: [{ title: '£25.00 M&S voucher', target_points: 20, quantity: 2 }, { title: 'Pizza delivery for your shift', target_points: 40, quantity: null }] }),
    pointsMail({ name: 'Training champions', total: 15, fresh: [{ label: 'Completed Safeguarding Adults', points: 10 }, { label: 'Finished Safeguarding Adults on time', points: 5 }], next: { title: '£25.00 M&S voucher', target: 20 } }),
    winnerMail({ name: 'Training champions', org, won: ['£25.00 M&S voucher', 'Pizza delivery for your shift'] }),
    thanksMail({ name: 'Training champions', points: 15, outstanding: 2 }),
  ]
  for (const [i, m] of mails.entries()) {
    await sendIncentiveEmail({ to: [member.email], subject: `[Preview ${i + 1} of ${mails.length}] ${m.subject}`, heading: m.heading, body: m.body, buttonLabel: m.buttonLabel, link: `${siteUrl()}/chat?view=my-incentives`, orgName: org })
  }
  ok(res, { sent: mails.length, to: member.email })
})
