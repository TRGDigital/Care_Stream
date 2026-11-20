// Hub overlay notices: when an admin allocates something to a staff member, the hub shows an overlay the next time it is open,
// using the SAME words as the person-led email (built once in email/person-content.ts).
//
//   - Stored in their own table (staff_notices), never on the User model, read and written through (prisma as any).
//   - SAFETY: the table may not exist yet. Every function here swallows errors, so creating a notice can never break an
//     allocation or an email, and the read endpoints answer an empty list until the SQL has been run.
//   - Isolation: every read and write is scoped to the signed-in person's own tenant AND user id.

import { prisma } from '../db/client'
import { staffPhotoUrls } from '../lib/staff-photos'
import type { PersonContent, NoticeDetail } from './email/person-content'

export const MAX_NOTICES = 10

export interface NoticeDeps {
  db: any
  photoUrls: (tenantId: string, userIds: string[]) => Promise<Map<string, string>>
}
const defaults = (): NoticeDeps => ({ db: prisma as any, photoUrls: staffPhotoUrls })

/** One notice, as the hub receives it. */
export interface StaffNoticeView {
  id: string
  kind: string
  headline: string
  intro: string | null
  details: NoticeDetail[]
  button_label: string | null
  href: string | null
  created_at: string
  actor: { name: string; job_role: string; home_name: string | null; photo_url: string | null } | null
}

const cleanDetails = (v: unknown): NoticeDetail[] =>
  Array.isArray(v) ? v.filter((d: any) => d && typeof d.label === 'string' && typeof d.value === 'string').map((d: any) => ({ label: d.label, value: d.value })) : []

/**
 * Create one notice per recipient from the shared content builder. Skips nobody-acting cases (automated emails) and a person
 * allocating to themselves. Never throws.
 */
export async function recordNotices(o: {
  tenantId: string
  userIds: string[]
  actorUserId?: string | null
  kind: string
  build: (adminName: string) => PersonContent
  /** Only the owner-only test route sets this, so an admin can see their own overlay. Real allocations never do. */
  allowSelf?: boolean
}, deps: NoticeDeps = defaults()): Promise<number> {
  try {
    if (!o.actorUserId || !o.tenantId) return 0
    const recipients = [...new Set(o.userIds.filter(Boolean))].filter(id => o.allowSelf || id !== o.actorUserId)
    if (!recipients.length) return 0
    const actor = await deps.db.user.findUnique({ where: { id: o.actorUserId }, select: { name: true } })
    if (!actor?.name) return 0
    const c = o.build(actor.name)
    const res = await deps.db.staffNotice.createMany({
      data: recipients.map(userId => ({
        tenant_id: o.tenantId, user_id: userId, actor_user_id: o.actorUserId, kind: o.kind,
        headline: c.headline, intro: c.intro ?? null, details: c.details,
        button_label: c.buttonLabel, href: c.path,
      })),
    })
    return res?.count ?? recipients.length
  } catch (e: any) {
    console.error('[staff-notices] could not create notice:', e?.message ?? e)
    return 0
  }
}

/** The signed-in person's unseen notices, newest first, at most MAX_NOTICES. Empty when the table is not there yet. */
export async function listNotices(tenantId: string, userId: string, deps: NoticeDeps = defaults()): Promise<StaffNoticeView[]> {
  try {
    const rows: any[] = await deps.db.staffNotice.findMany({
      where: { tenant_id: tenantId, user_id: userId, seen_at: null },
      orderBy: { created_at: 'desc' },
      take: MAX_NOTICES,
    })
    if (!rows.length) return []
    const actorIds = [...new Set(rows.map(r => r.actor_user_id).filter(Boolean))] as string[]
    const actors: any[] = actorIds.length
      ? await deps.db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, job_role: true, role: true, tenant_id: true } }).catch(() => [])
      : []
    const tenantIds = [...new Set(actors.map(a => a.tenant_id).filter(Boolean))] as string[]
    const tenants: any[] = tenantIds.length ? await deps.db.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }).catch(() => []) : []
    const photos = await deps.photoUrls(tenantId, actorIds).catch(() => new Map<string, string>())
    return rows.map(r => {
      const a = actors.find(x => x.id === r.actor_user_id)
      return {
        id: r.id, kind: r.kind, headline: r.headline, intro: r.intro ?? null, details: cleanDetails(r.details),
        button_label: r.button_label ?? null, href: r.href ?? null,
        created_at: new Date(r.created_at).toISOString(),
        actor: a?.name ? {
          name: a.name,
          job_role: (a.job_role || '').trim() || (a.role === 'admin' ? 'Admin' : 'Team member'),
          home_name: tenants.find(t => t.id === a.tenant_id)?.name ?? null,
          photo_url: photos.get(a.id) ?? null,
        } : null,
      }
    })
  } catch { return [] }
}

/** Mark one of MY notices seen. Returns false when it is not mine, not found or the table is not there. */
export async function markNoticeSeen(tenantId: string, userId: string, id: string, deps: NoticeDeps = defaults()): Promise<boolean> {
  try {
    const r = await deps.db.staffNotice.updateMany({ where: { id, tenant_id: tenantId, user_id: userId, seen_at: null }, data: { seen_at: new Date() } })
    return (r?.count ?? 0) > 0
  } catch { return false }
}

export async function markAllNoticesSeen(tenantId: string, userId: string, deps: NoticeDeps = defaults()): Promise<number> {
  try {
    const r = await deps.db.staffNotice.updateMany({ where: { tenant_id: tenantId, user_id: userId, seen_at: null }, data: { seen_at: new Date() } })
    return r?.count ?? 0
  } catch { return 0 }
}
