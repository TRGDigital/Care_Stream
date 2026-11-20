// "This is me" resident profiles (Professional and Enterprise). Mounted at /residents after requireAuth.
//
//   GET    /meta                         section definitions, whether the plan has it, whether this admin can action archives
//   GET    /hub                          staff view: living residents with approved content (any signed in user)
//   GET/PUT /archive-access              which admins can action archives (archive admins only)
//   GET    /?scope=current|archived      list (archived needs the archive permission)
//   POST   /                             create          GET /:id detail        PATCH /:id update
//   POST   /:id/status                   died or moved on: out of the hub and assistant at once, links cancelled, archive task started
//   POST   /:id/invites                  email a friend or family member a private link (+ /resend, DELETE /:inviteId)
//   POST   /:id/contributions/:cid/decision   approve (optionally edited) or reject a family answer
//   POST   /:id/photos                   a manager adds a photo (approved at once)      DELETE /:id/photos/:pid   remove one
//   POST   /:id/photos/:pid/decision     approve (optionally with an edited caption) or reject a family photo
//   POST   /:id/archive/confirm | /retention | GET /export | DELETE /:id         archive actions (archive admins only)
//
// Family answers and photos are NEVER shown to staff until an admin approves them. Only LIVING residents reach the hub and the assistant.
// Photos are private files served through short-lived signed links (lib/resident-photos.ts) and are never part of the assistant's knowledge.

import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { residentPhotoUploadMiddleware } from '../middleware/upload'
import { writeAuditLog } from '../lib/audit'
import { siteUrl } from '../lib/urls'
import { deleteFile } from '../services/storage/s3'
import {
  SECTIONS, SECTION_KEYS, RETENTION_YEARS, INVITE_DAYS, labelFor, residentsEnabled, tablesReady, cleanText, displayName, ageFrom, dateOnly, addYears,
  newInviteToken, canManageArchive, archiveAdmins, archiveAccessIds, saveArchiveAccessIds, syncResidentKnowledge,
} from '../lib/residents'
import {
  photosReady, processAndStorePhoto, cleanCaption, cleanPeople, adminPhotoDto, hubPhotoDto, discardPhotoFile, deleteResidentPhotos,
} from '../lib/resident-photos'
import { residentRemindersRouter } from './family-reminders'
import { cancelResidentReminders } from '../lib/family-reminders'
import { sendResidentFamilyInviteEmail, sendResidentArchiveTaskEmail } from '../services/email/outbound'

export const residentsRouter = Router()
const db = prisma as any

const DATE = /^\d{4}-\d{2}-\d{2}$/
const parseDate = (s: string): Date | null => { if (!DATE.test(s)) return null; const d = new Date(`${s}T00:00:00.000Z`); return isNaN(+d) ? null : d }
const today = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')

async function actor(req: Request) {
  const u = await db.user.findUnique({ where: { id: req.user!.sub }, select: { id: true, name: true, email: true } })
  return { id: req.user!.sub, name: u?.name ?? 'An admin', email: u?.email ?? 'unknown' }
}

// Plan and table gate for everything except /meta and /hub (which answer enabled:false instead of an error).
async function gate(req: Request, res: Response, next: NextFunction) {
  const tenantId = getTenantId()
  if (!(await residentsEnabled(tenantId))) { err(res, 'FEATURE_NOT_AVAILABLE', 'Resident profiles are on the Professional and Enterprise plans. Upgrade to use them.', 403); return }
  if (!(await tablesReady())) { err(res, 'NOT_READY', 'Resident profiles are being set up. Please try again shortly.', 503); return }
  next()
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────
const filled = (s: Record<string, string>) => Object.values(s).filter(v => typeof v === 'string' && v.trim()).length
function dto(r: any, pending = 0, invites = 0) {
  const sections = (r.sections ?? {}) as Record<string, string>
  return {
    id: r.id, first_name: r.first_name, last_name: r.last_name, preferred_name: r.preferred_name ?? null,
    dob: dateOnly(r.dob), room: r.room ?? null, status: r.status, status_at: dateOnly(r.status_at),
    sections, filled_count: filled(sections), pending_count: pending, invite_count: invites,
    updated_at: r.updated_at.toISOString(), archived_at: r.archived_at ? r.archived_at.toISOString() : null,
    retention_until: dateOnly(r.retention_until), archive: r.archive ?? null,
  }
}
function inviteDto(i: any) {
  const now = new Date()
  const status = i.revoked_at ? 'revoked' : i.submitted_at ? 'submitted' : i.expires_at < now ? 'expired' : i.opened_at ? 'opened' : 'sent'
  return {
    id: i.id, email: i.email, name: i.name, relationship: i.relationship, status,
    sent_at: i.sent_at.toISOString(), expires_at: i.expires_at.toISOString(),
    opened_at: i.opened_at ? i.opened_at.toISOString() : null, submitted_at: i.submitted_at ? i.submitted_at.toISOString() : null,
  }
}
const contribDto = (c: any) => ({
  id: c.id, invite_id: c.invite_id, contributor_name: c.contributor_name, relationship: c.relationship, section_key: c.section_key, text: c.text,
  status: c.status, submitted_at: c.submitted_at.toISOString(), decided_at: c.decided_at ? c.decided_at.toISOString() : null,
  decided_by: c.decided_by ?? null, approved_text: c.approved_text ?? null,
})
async function counts(tenantId: string, ids: string[]) {
  if (!ids.length) return { pending: new Map<string, number>(), invites: new Map<string, number>() }
  const [p, i] = await Promise.all([
    db.residentContribution.groupBy({ by: ['resident_id'], where: { tenant_id: tenantId, resident_id: { in: ids }, status: 'pending' }, _count: { _all: true } }),
    db.residentInvite.groupBy({ by: ['resident_id'], where: { tenant_id: tenantId, resident_id: { in: ids }, revoked_at: null }, _count: { _all: true } }),
  ])
  const pending = new Map<string, number>(p.map((x: any) => [x.resident_id, x._count._all]))
  // Photos waiting for approval count towards the same badge. The photos table may not exist yet, which just means none.
  try {
    const ph = await db.residentPhoto.groupBy({ by: ['resident_id'], where: { tenant_id: tenantId, resident_id: { in: ids }, status: 'pending' }, _count: { _all: true } })
    for (const x of ph) pending.set(x.resident_id, (pending.get(x.resident_id) ?? 0) + x._count._all)
  } catch { /* photos table not created yet */ }
  return {
    pending,
    invites: new Map<string, number>(i.map((x: any) => [x.resident_id, x._count._all])),
  }
}
async function loadResident(tenantId: string, id: string) {
  return db.resident.findFirst({ where: { id, tenant_id: tenantId } })
}

// ─── Meta and hub (open to the plan check, not the table check) ────────────────
residentsRouter.get('/meta', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const enabled = (await residentsEnabled(tenantId)) && (await tablesReady())
  const can = enabled ? await canManageArchive(tenantId, req.user!.sub, req.user!.role) : false
  ok(res, { enabled, sections: SECTIONS, can_manage_archive: can, retention_years: RETENTION_YEARS })
})

residentsRouter.get('/hub', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const off = { enabled: false, section_defs: SECTIONS, residents: [] as unknown[] }
  if (!(await residentsEnabled(tenantId)) || !(await tablesReady())) { ok(res, off); return }
  const rows = await db.resident.findMany({ where: { tenant_id: tenantId, status: 'living' }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }], take: 500 })
  // Approved photos of these living residents only. Missing table = no photos.
  const photosBy = new Map<string, any[]>()
  try {
    const ph = await db.residentPhoto.findMany({ where: { tenant_id: tenantId, resident_id: { in: rows.map((r: any) => r.id) }, status: 'approved', s3_key: { not: '' } }, orderBy: { decided_at: 'desc' }, take: 2000 })
    for (const p of ph) photosBy.set(p.resident_id, [...(photosBy.get(p.resident_id) ?? []), p])
  } catch { /* photos table not created yet */ }
  const residents = rows.map((r: any) => {
    const raw = (r.sections ?? {}) as Record<string, string>
    const sections: Record<string, string> = {}
    for (const d of SECTIONS) if (typeof raw[d.key] === 'string' && raw[d.key].trim()) sections[d.key] = raw[d.key]
    return { id: r.id, display_name: displayName(r), first_name: r.first_name, preferred_name: r.preferred_name ?? null, age: ageFrom(r.dob), room: r.room ?? null, sections, photos: (photosBy.get(r.id) ?? []).slice(0, 30).map(hubPhotoDto), updated_at: r.updated_at.toISOString() }
  }).filter((r: any) => Object.keys(r.sections).length > 0 || r.photos.length > 0)
  ok(res, { enabled: residents.length > 0, section_defs: SECTIONS, residents })
})

// Everything below is for admins on a plan that has the feature.
residentsRouter.use(requireAdmin)
residentsRouter.use(gate)
residentsRouter.use('/:id/reminders', residentRemindersRouter)   // family reminder settings (routes/family-reminders.ts)

// ─── Who can action archives ───────────────────────────────────────────────────
residentsRouter.get('/archive-access', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  if (!(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archive settings.', 403); return }
  const admins = await db.user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } })
  const ids = await archiveAccessIds(tenantId)
  ok(res, { admins: admins.map((a: any) => ({ id: a.id, name: a.name, email: a.email, has_access: ids === null || ids.includes(a.id) })) })
})

residentsRouter.put('/archive-access', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  if (!(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archive settings.', 403); return }
  const parsed = z.object({ user_ids: z.array(z.string()).max(50) }).safeParse(req.body)
  if (!parsed.success) { err(res, 'VALIDATION_ERROR', 'user_ids must be a list.'); return }
  const admins = await db.user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { id: true } })
  const valid = new Set<string>(admins.map((a: any) => a.id))
  const ids = Array.from(new Set(parsed.data.user_ids.filter(id => valid.has(id))))
  if (!ids.length) { err(res, 'VALIDATION_ERROR', 'At least one admin must be able to action archives.'); return }
  await saveArchiveAccessIds(tenantId, ids)
  ok(res, { saved: true })
})

// ─── List, create, read, update ────────────────────────────────────────────────
residentsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const archived = req.query.scope === 'archived'
  if (archived) {
    if (!(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archived residents.', 403); return }
    const a = await actor(req)
    void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_archive_viewed', entity_type: 'tenant', entity_id: tenantId, metadata: {} })
  }
  const rows = await db.resident.findMany({
    where: { tenant_id: tenantId, status: archived ? { in: ['left', 'deceased'] } : 'living' },
    orderBy: archived ? [{ archived_at: 'desc' }] : [{ first_name: 'asc' }, { last_name: 'asc' }], take: 1000,
  })
  const c = await counts(tenantId, rows.map((r: any) => r.id))
  ok(res, { residents: rows.map((r: any) => dto(r, c.pending.get(r.id) ?? 0, c.invites.get(r.id) ?? 0)) })
})

const SectionsSchema = z.record(z.string(), z.string().max(6000)).optional()
const CreateSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  preferred_name: z.string().trim().max(80).nullish(),
  dob: z.string().regex(DATE).nullish().or(z.literal('')),
  room: z.string().trim().max(40).nullish(),
  sections: SectionsSchema,
})

function cleanSections(input: Record<string, string> | undefined, base: Record<string, string> = {}) {
  const out = { ...base }
  for (const [k, v] of Object.entries(input ?? {})) {
    if (!SECTION_KEYS.has(k)) continue
    const t = cleanText(v, 6000)
    if (t) out[k] = t; else delete out[k]
  }
  return out
}
function dobOrNull(v: string | null | undefined): Date | null | 'bad' {
  if (!v) return null
  const d = parseDate(v)
  if (!d || d > today() || d.getUTCFullYear() < 1890) return 'bad'
  return d
}

residentsRouter.post('/', async (req: Request, res: Response) => {
  const p = CreateSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', p.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')); return }
  const tenantId = getTenantId()
  const dob = dobOrNull(p.data.dob || null)
  if (dob === 'bad') { err(res, 'VALIDATION_ERROR', 'Date of birth is not valid.'); return }
  if ((await db.resident.count({ where: { tenant_id: tenantId, status: 'living' } })) >= 500) { err(res, 'LIMIT', 'You have reached the limit of 500 current residents.', 403); return }
  const a = await actor(req)
  const r = await db.resident.create({
    data: {
      tenant_id: tenantId, first_name: cleanText(p.data.first_name, 80), last_name: cleanText(p.data.last_name, 80),
      preferred_name: p.data.preferred_name ? cleanText(p.data.preferred_name, 80) : null, dob, room: p.data.room ? cleanText(p.data.room, 40) : null,
      sections: cleanSections(p.data.sections), created_by: a.email,
    },
  })
  await syncResidentKnowledge(tenantId, r.id)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_created', entity_type: 'resident', entity_id: r.id, metadata: {} })
  ok(res, dto(await loadResident(tenantId, r.id)), 201)
})

residentsRouter.get('/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living' && !(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archived residents.', 403); return }
  const [invites, contribs] = await Promise.all([
    db.residentInvite.findMany({ where: { tenant_id: tenantId, resident_id: r.id }, orderBy: { sent_at: 'desc' } }),
    db.residentContribution.findMany({ where: { tenant_id: tenantId, resident_id: r.id }, orderBy: { submitted_at: 'desc' } }),
  ])
  let photos: any[] = []
  try { photos = await db.residentPhoto.findMany({ where: { tenant_id: tenantId, resident_id: r.id }, orderBy: { submitted_at: 'desc' }, take: 500 }) } catch { /* photos table not created yet */ }
  const pending = contribs.filter((c: any) => c.status === 'pending').length + photos.filter((p: any) => p.status === 'pending').length
  ok(res, { ...dto(r, pending, invites.filter((i: any) => !i.revoked_at).length), invites: invites.map(inviteDto), contributions: contribs.map(contribDto), photos: photos.map(adminPhotoDto) })
})

residentsRouter.patch('/:id', async (req: Request, res: Response) => {
  const p = CreateSchema.partial().safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', p.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'An archived profile cannot be edited.', 409); return }
  const data: Record<string, unknown> = {}
  if (p.data.first_name !== undefined) data.first_name = cleanText(p.data.first_name, 80)
  if (p.data.last_name !== undefined) data.last_name = cleanText(p.data.last_name, 80)
  if (p.data.preferred_name !== undefined) data.preferred_name = p.data.preferred_name ? cleanText(p.data.preferred_name, 80) : null
  if (p.data.room !== undefined) data.room = p.data.room ? cleanText(p.data.room, 40) : null
  if (p.data.dob !== undefined) { const d = dobOrNull(p.data.dob || null); if (d === 'bad') { err(res, 'VALIDATION_ERROR', 'Date of birth is not valid.'); return } data.dob = d }
  if (p.data.sections !== undefined) data.sections = cleanSections(p.data.sections, (r.sections ?? {}) as Record<string, string>)
  const u = await db.resident.update({ where: { id: r.id }, data })
  await syncResidentKnowledge(tenantId, r.id)
  const a = await actor(req)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_updated', entity_type: 'resident', entity_id: r.id, metadata: { fields: Object.keys(data) } })
  const c = await counts(tenantId, [r.id])
  ok(res, dto(u, c.pending.get(r.id) ?? 0, c.invites.get(r.id) ?? 0))
})

// ─── Died or moved on ──────────────────────────────────────────────────────────
residentsRouter.post('/:id/status', async (req: Request, res: Response) => {
  const p = z.object({ status: z.enum(['left', 'deceased']), date: z.string().regex(DATE).optional(), note: z.string().trim().max(500).optional() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Choose passed away or moved on, and a valid date.'); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'This resident is already archived.', 409); return }
  const when = p.data.date ? parseDate(p.data.date) : today()
  if (!when || when > today()) { err(res, 'VALIDATION_ERROR', 'The date cannot be in the future.'); return }
  const now = new Date()
  const retention = addYears(today(), RETENTION_YEARS)
  const admins = await archiveAdmins(tenantId)
  const a = await actor(req)

  await db.resident.update({
    where: { id: r.id },
    data: {
      status: p.data.status, status_at: when, status_note: p.data.note ? cleanText(p.data.note, 500) : null, archived_at: now, retention_until: retention,
      archive: { confirmed_at: null, confirmed_by: null, family_contacts_removed_at: null, memory_book: 'undecided', memory_book_at: null, note: null, assignee_emails: admins.map(x => x.email) },
    },
  })
  // Cancel every family link and set aside anything still waiting: none of it may reach staff now.
  await db.residentInvite.updateMany({ where: { tenant_id: tenantId, resident_id: r.id, revoked_at: null }, data: { revoked_at: now } })
  await cancelResidentReminders(tenantId, r.id)   // no more family reminders
  await db.residentContribution.updateMany({ where: { tenant_id: tenantId, resident_id: r.id, status: 'pending' }, data: { status: 'rejected', decided_at: now, decided_by: 'system: resident archived' } })
  // Photos: approved ones drop out of the hub at once (it only lists photos of living residents, and the file route checks again),
  // but stay in private storage for the retention period like the written profile, and go with it when it is deleted.
  // Anything still waiting is set aside and its file removed, because nobody will review it now.
  try {
    const waiting = await db.residentPhoto.findMany({ where: { tenant_id: tenantId, resident_id: r.id, status: 'pending' } })
    for (const p of waiting) await discardPhotoFile(p)
    await db.residentPhoto.updateMany({ where: { tenant_id: tenantId, resident_id: r.id, status: 'pending' }, data: { status: 'rejected', decided_at: now, decided_by: 'system: resident archived' } })
  } catch { /* photos table not created yet */ }
  await syncResidentKnowledge(tenantId, r.id)   // removes the assistant's knowledge of them
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_archived', entity_type: 'resident', entity_id: r.id, metadata: { status: p.data.status } })

  try {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    await sendResidentArchiveTaskEmail({
      to: admins.map(x => x.email), homeName: tenant?.name ?? 'your home', residentName: displayName(r), status: p.data.status,
      statusDate: dateOnly(when) ?? '', retentionUntil: dateOnly(retention) ?? '', link: `${siteUrl()}/knowledge`,
    })
  } catch (e) { console.error('[residents] archive email failed:', e) }

  const c = await counts(tenantId, [r.id])
  ok(res, dto(await loadResident(tenantId, r.id), c.pending.get(r.id) ?? 0, c.invites.get(r.id) ?? 0))
})

// ─── Family invitations ────────────────────────────────────────────────────────
const InviteSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), name: z.string().trim().min(1).max(100), relationship: z.string().trim().min(1).max(60) })

async function sendInvite(opts: { tenantId: string; resident: any; invite: any; token: string; senderName: string }) {
  const tenant = await db.tenant.findUnique({ where: { id: opts.tenantId }, select: { name: true } })
  await sendResidentFamilyInviteEmail({
    to: opts.invite.email, inviteeName: opts.invite.name, residentName: opts.resident.preferred_name || opts.resident.first_name,
    homeName: tenant?.name ?? 'the home', senderName: opts.senderName, link: `${siteUrl()}/family/${opts.token}`, days: INVITE_DAYS,
  })
}

residentsRouter.post('/:id/invites', async (req: Request, res: Response) => {
  const p = InviteSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please give a name, a valid email address and how they know the resident.'); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot invite family for an archived profile.', 409); return }
  const active = await db.residentInvite.findMany({ where: { tenant_id: tenantId, resident_id: r.id, revoked_at: null } })
  if (active.length >= 10) { err(res, 'LIMIT', 'You can have up to 10 invitations for one resident.', 403); return }
  if (active.some((i: any) => i.email === p.data.email)) { err(res, 'DUPLICATE', 'That person has already been invited. Use Resend instead.', 409); return }
  const a = await actor(req)
  const { token, hash } = newInviteToken()
  const invite = await db.residentInvite.create({
    data: { tenant_id: tenantId, resident_id: r.id, email: p.data.email, name: cleanText(p.data.name, 100), relationship: cleanText(p.data.relationship, 60), token_hash: hash, expires_at: new Date(Date.now() + INVITE_DAYS * 86400000), created_by: a.email },
  })
  try { await sendInvite({ tenantId, resident: r, invite, token, senderName: a.name }) }
  catch (e: any) {
    await db.residentInvite.delete({ where: { id: invite.id } }).catch(() => undefined)
    err(res, 'EMAIL_FAILED', 'We could not send the email. Please check the address and try again.', 502); return
  }
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_family_invited', entity_type: 'resident', entity_id: r.id, metadata: { relationship: p.data.relationship } })
  ok(res, inviteDto(invite), 201)
})

// A link to copy and send yourself (in your own email, a message or a letter) instead of having CareStream email it.
// Only the hash of a link is stored, so an existing link cannot be shown again: copying a link for someone already
// invited makes a NEW one, and the one sent before stops working. The email address is optional here.
const LinkSchema = z.object({ email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(200)]).optional(), name: z.string().trim().min(1).max(100), relationship: z.string().trim().min(1).max(60) })

residentsRouter.post('/:id/invites/link', async (req: Request, res: Response) => {
  const p = LinkSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please give a name and how they know the resident. An email address is optional.'); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot invite family for an archived profile.', 409); return }
  const active = await db.residentInvite.findMany({ where: { tenant_id: tenantId, resident_id: r.id, revoked_at: null } })
  if (active.length >= 10) { err(res, 'LIMIT', 'You can have up to 10 invitations for one resident.', 403); return }
  const email = p.data.email ?? ''
  if (email && active.some((i: any) => i.email === email)) { err(res, 'DUPLICATE', 'That person has already been invited. Use Copy link on their row instead.', 409); return }
  const a = await actor(req)
  const { token, hash } = newInviteToken()
  const invite = await db.residentInvite.create({
    data: { tenant_id: tenantId, resident_id: r.id, email, name: cleanText(p.data.name, 100), relationship: cleanText(p.data.relationship, 60), token_hash: hash, expires_at: new Date(Date.now() + INVITE_DAYS * 86400000), created_by: a.email },
  })
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_family_link_created', entity_type: 'resident', entity_id: r.id, metadata: { relationship: p.data.relationship, new_person: true } })
  ok(res, { invite: inviteDto(invite), link: `${siteUrl()}/family/${token}` }, 201)
})

residentsRouter.post('/:id/invites/:inviteId/link', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const inv = r ? await db.residentInvite.findFirst({ where: { id: String(req.params.inviteId), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !inv || inv.revoked_at) { err(res, 'NOT_FOUND', 'Invitation not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot invite family for an archived profile.', 409); return }
  const a = await actor(req)
  const { token, hash } = newInviteToken()
  const updated = await db.residentInvite.update({ where: { id: inv.id }, data: { token_hash: hash, expires_at: new Date(Date.now() + INVITE_DAYS * 86400000), opened_at: null, submitted_at: null } })
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_family_link_created', entity_type: 'resident', entity_id: r.id, metadata: { relationship: inv.relationship, new_person: false } })
  ok(res, { invite: inviteDto(updated), link: `${siteUrl()}/family/${token}` })
})

residentsRouter.post('/:id/invites/:inviteId/resend', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const inv = r ? await db.residentInvite.findFirst({ where: { id: String(req.params.inviteId), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !inv || inv.revoked_at) { err(res, 'NOT_FOUND', 'Invitation not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot invite family for an archived profile.', 409); return }
  const a = await actor(req)
  const { token, hash } = newInviteToken()
  const updated = await db.residentInvite.update({ where: { id: inv.id }, data: { token_hash: hash, sent_at: new Date(), expires_at: new Date(Date.now() + INVITE_DAYS * 86400000), opened_at: null, submitted_at: null } })
  try { await sendInvite({ tenantId, resident: r, invite: updated, token, senderName: a.name }) }
  catch { err(res, 'EMAIL_FAILED', 'We could not send the email. Please try again.', 502); return }
  ok(res, inviteDto(updated))
})

residentsRouter.delete('/:id/invites/:inviteId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const inv = await db.residentInvite.findFirst({ where: { id: String(req.params.inviteId), resident_id: String(req.params.id), tenant_id: tenantId } })
  if (!inv) { err(res, 'NOT_FOUND', 'Invitation not found.', 404); return }
  await db.residentInvite.update({ where: { id: inv.id }, data: { revoked_at: new Date() } })
  ok(res, { revoked: true })
})

// ─── Approve or reject a family answer ─────────────────────────────────────────
residentsRouter.post('/:id/contributions/:cid/decision', async (req: Request, res: Response) => {
  const p = z.object({ decision: z.enum(['approve', 'reject']), text: z.string().max(6000).optional() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'decision must be approve or reject.'); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const c = r ? await db.residentContribution.findFirst({ where: { id: String(req.params.cid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !c) { err(res, 'NOT_FOUND', 'Answer not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'This profile is archived.', 409); return }
  if (c.status !== 'pending') { err(res, 'DECIDED', 'This answer has already been decided.', 409); return }
  const a = await actor(req)
  const now = new Date()
  let approvedText: string | null = null
  if (p.data.decision === 'approve') {
    const final = cleanText(p.data.text ?? c.text, 4000)
    if (!final) { err(res, 'VALIDATION_ERROR', 'There is no text to approve.'); return }
    approvedText = final === c.text ? null : final
    const sections = { ...((r.sections ?? {}) as Record<string, string>) }
    const add = `${final} (${c.contributor_name}, ${c.relationship})`
    sections[c.section_key] = sections[c.section_key] ? `${sections[c.section_key]}\n\n${add}` : add
    await db.resident.update({ where: { id: r.id }, data: { sections } })
  }
  const upd = await db.residentContribution.update({
    where: { id: c.id }, data: { status: p.data.decision === 'approve' ? 'approved' : 'rejected', decided_at: now, decided_by: a.email, approved_text: approvedText },
  })
  if (p.data.decision === 'approve') await syncResidentKnowledge(tenantId, r.id)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_contribution_decided', entity_type: 'resident', entity_id: r.id, metadata: { decision: p.data.decision, section: c.section_key } })
  ok(res, contribDto(upd))
})

// ─── Photos ────────────────────────────────────────────────────────────────────
// A manager adds a photo directly: approved at once, logged. Family photos arrive through routes/residents-public.ts as PENDING.
async function photoGate(res: Response): Promise<boolean> {
  if (await photosReady()) return true
  err(res, 'NOT_READY', 'Photos are being set up. Please try again shortly.', 503)
  return false
}

residentsRouter.post('/:id/photos', residentPhotoUploadMiddleware, async (req: Request, res: Response) => {
  if (!(await photoGate(res))) return
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot add photos to an archived profile.', 409); return }
  if ((await db.residentPhoto.count({ where: { tenant_id: tenantId, resident_id: r.id, status: { not: 'rejected' } } })) >= 100) { err(res, 'LIMIT', 'A profile can hold up to 100 photos. Delete some first.', 403); return }
  const done = await processAndStorePhoto({ tenantId, residentId: r.id, file: (req as any).file })
  if (!done.ok) { err(res, done.code, done.message, done.status); return }
  const a = await actor(req)
  const photo = await db.residentPhoto.create({
    data: {
      tenant_id: tenantId, resident_id: r.id, invite_id: null, uploaded_by_name: a.name, relationship: null, source: 'manager',
      caption: cleanCaption(req.body?.caption), people_note: cleanPeople(req.body?.people_note), s3_key: done.s3Key, mime: done.mime, size_bytes: done.size,
      width: done.width, height: done.height, status: 'approved', scan_status: done.scan, decided_at: new Date(), decided_by: a.email,
    },
  })
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_photo_added', entity_type: 'resident', entity_id: r.id, metadata: { photo_id: photo.id, source: 'manager' } })
  ok(res, adminPhotoDto(photo), 201)
})

residentsRouter.post('/:id/photos/:pid/decision', async (req: Request, res: Response) => {
  const p = z.object({ decision: z.enum(['approve', 'reject']), caption: z.string().max(400).nullish() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'decision must be approve or reject.'); return }
  if (!(await photoGate(res))) return
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const ph = r ? await db.residentPhoto.findFirst({ where: { id: String(req.params.pid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !ph) { err(res, 'NOT_FOUND', 'Photo not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'This profile is archived.', 409); return }
  if (ph.status !== 'pending') { err(res, 'DECIDED', 'This photo has already been decided.', 409); return }
  const a = await actor(req)
  const data: Record<string, unknown> = { status: p.data.decision === 'approve' ? 'approved' : 'rejected', decided_at: new Date(), decided_by: a.email }
  if (p.data.decision === 'approve' && p.data.caption !== undefined) data.caption = cleanCaption(p.data.caption)   // the manager may edit the caption
  const upd = await db.residentPhoto.update({ where: { id: ph.id }, data })
  if (p.data.decision === 'reject') { await discardPhotoFile(upd); upd.s3_key = '' }   // a rejected photo is not kept
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_photo_decided', entity_type: 'resident', entity_id: r.id, metadata: { decision: p.data.decision, photo_id: ph.id } })
  ok(res, adminPhotoDto(upd))
})

residentsRouter.delete('/:id/photos/:pid', async (req: Request, res: Response) => {
  if (!(await photoGate(res))) return
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const ph = r ? await db.residentPhoto.findFirst({ where: { id: String(req.params.pid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !ph) { err(res, 'NOT_FOUND', 'Photo not found.', 404); return }
  if (r.status !== 'living' && !(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archived residents.', 403); return }
  const a = await actor(req)
  if (ph.s3_key) await deleteFile(ph.s3_key)
  await db.residentPhoto.delete({ where: { id: ph.id } })
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_photo_deleted', entity_type: 'resident', entity_id: r.id, metadata: { photo_id: ph.id, status: ph.status } })
  ok(res, { deleted: true })
})

// ─── Archive actions ───────────────────────────────────────────────────────────
async function archived(req: Request, res: Response) {
  const tenantId = getTenantId()
  if (!(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archived residents.', 403); return null }
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return null }
  if (r.status === 'living') { err(res, 'NOT_ARCHIVED', 'This resident is not archived.', 409); return null }
  return { tenantId, r }
}

residentsRouter.post('/:id/archive/confirm', async (req: Request, res: Response) => {
  const p = z.object({ memory_book: z.enum(['shared', 'declined']), note: z.string().trim().max(1000).optional(), remove_family_contacts: z.boolean().optional() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Say whether a memory book was shared with the family or declined.'); return }
  const ctx = await archived(req, res); if (!ctx) return
  const a = await actor(req)
  const now = new Date()
  const cur = (ctx.r.archive ?? {}) as Record<string, unknown>
  const next = {
    ...cur, confirmed_at: now.toISOString(), confirmed_by: a.email, memory_book: p.data.memory_book, memory_book_at: now.toISOString(),
    note: p.data.note ? cleanText(p.data.note, 1000) : (cur.note ?? null),
    family_contacts_removed_at: p.data.remove_family_contacts ? now.toISOString() : (cur.family_contacts_removed_at ?? null),
  }
  if (p.data.remove_family_contacts) await db.residentInvite.updateMany({ where: { tenant_id: ctx.tenantId, resident_id: ctx.r.id }, data: { email: '[removed]' } })
  const u = await db.resident.update({ where: { id: ctx.r.id }, data: { archive: next } })
  void writeAuditLog({ tenant_id: ctx.tenantId, user_id: a.id, event_type: 'resident_archive_confirmed', entity_type: 'resident', entity_id: ctx.r.id, metadata: { memory_book: p.data.memory_book, family_contacts_removed: !!p.data.remove_family_contacts } })
  ok(res, dto(u))
})

residentsRouter.post('/:id/archive/retention', async (req: Request, res: Response) => {
  const p = z.object({ retention_until: z.string().regex(DATE) }).safeParse(req.body)
  const d = p.success ? parseDate(p.data.retention_until) : null
  if (!d) { err(res, 'VALIDATION_ERROR', 'Choose a valid date.'); return }
  const ctx = await archived(req, res); if (!ctx) return
  const minimum = addYears(ctx.r.archived_at ?? new Date(), RETENTION_YEARS)
  minimum.setUTCHours(0, 0, 0, 0)
  if (d < minimum) { err(res, 'VALIDATION_ERROR', `The retention period is ${RETENTION_YEARS} years from archiving, so the date cannot be earlier than ${dateOnly(minimum)}. You can extend it.`); return }
  const a = await actor(req)
  const u = await db.resident.update({ where: { id: ctx.r.id }, data: { retention_until: d, retention_notified_at: null } })
  void writeAuditLog({ tenant_id: ctx.tenantId, user_id: a.id, event_type: 'resident_retention_changed', entity_type: 'resident', entity_id: ctx.r.id, metadata: { retention_until: p.success ? p.data.retention_until : null } })
  ok(res, dto(u))
})

residentsRouter.get('/:id/archive/export', async (req: Request, res: Response) => {
  const ctx = await archived(req, res); if (!ctx) return
  const a = await actor(req)
  const r = ctx.r
  const contribs = await db.residentContribution.findMany({ where: { tenant_id: ctx.tenantId, resident_id: r.id, status: 'approved' }, orderBy: { submitted_at: 'asc' } })
  const sections = (r.sections ?? {}) as Record<string, string>
  const lines: string[] = [
    `This is me: ${r.first_name} ${r.last_name}${r.preferred_name ? ` (${r.preferred_name})` : ''}`,
    r.dob ? `Date of birth: ${dateOnly(r.dob)}` : '',
    r.room ? `Room: ${r.room}` : '',
    `${r.status === 'deceased' ? 'Passed away' : 'Moved on'}: ${dateOnly(r.status_at) ?? ''}`,
    '',
  ].filter((l, i) => l !== '' || i === 4)
  for (const d of SECTIONS) if (sections[d.key]) lines.push(d.label, sections[d.key], '')
  if (contribs.length) {
    lines.push('Added by family and friends', ...contribs.map((c: any) => `${labelFor(c.section_key)} (${c.contributor_name}, ${c.relationship}): ${c.approved_text ?? c.text}`), '')
  }
  void writeAuditLog({ tenant_id: ctx.tenantId, user_id: a.id, event_type: 'resident_exported', entity_type: 'resident', entity_id: r.id, metadata: {} })
  const safe = `${r.first_name}-${r.last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resident'
  ok(res, { filename: `this-is-me-${safe}.txt`, text: lines.join('\n') })
})

residentsRouter.delete('/:id', async (req: Request, res: Response) => {
  const p = z.object({ confirm: z.literal(true), reason: z.string().trim().max(500).optional() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please confirm that you want to delete this profile permanently.'); return }
  const ctx = await archived(req, res); if (!ctx) return
  const early = !!ctx.r.retention_until && ctx.r.retention_until > today()
  if (early && (p.data.reason ?? '').length < 5) { err(res, 'REASON_REQUIRED', `This profile is kept until ${dateOnly(ctx.r.retention_until)}. To delete it earlier, give a reason.`); return }
  const a = await actor(req)
  await syncResidentKnowledge(ctx.tenantId, ctx.r.id)   // belt and braces: nothing of theirs left in the assistant
  await deleteResidentPhotos(ctx.tenantId, ctx.r.id)   // files from storage first, then the rows
  await db.residentContribution.deleteMany({ where: { tenant_id: ctx.tenantId, resident_id: ctx.r.id } })
  await cancelResidentReminders(ctx.tenantId, ctx.r.id, true)
  await db.residentInvite.deleteMany({ where: { tenant_id: ctx.tenantId, resident_id: ctx.r.id } })
  await db.resident.delete({ where: { id: ctx.r.id } })
  void writeAuditLog({ tenant_id: ctx.tenantId, user_id: a.id, event_type: 'resident_deleted', entity_type: 'resident', entity_id: ctx.r.id, metadata: { early, reason: p.data.reason ?? null } })
  ok(res, { deleted: true })
})
