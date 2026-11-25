// The picture of one person in a newsletter (employee of the month, a staff story, a new starter or a leaver). Rules, in one place:
//   - only the administrator chooses it, and only with the person's agreement (consent is recorded with the choice);
//   - only the person's own staff picture is ever used, read from private storage; no picture means their initials, and the picture appears by itself once one is added;
//   - email never carries the picture (staff pictures have no public address), so the email shows initials and points to the hub and the PDF.
import { prisma } from '../../db/client'
import { staffPhotosReady } from '../../lib/staff-photos'

const p = () => prisma as any

/** The newsletter types that may carry a person's picture. */
export const PHOTO_TYPES = new Set(['employee-of-the-month', 'staff-stories', 'welcome-new-starters', 'leavers-farewells'])
export const photoAllowedFor = (templateId: string | null | undefined): boolean => {
  const id = String(templateId ?? ''); const type = id.replace(/-(short|standard|detailed)$/, '')
  return PHOTO_TYPES.has(type)
}
export const CONSENT_QUESTION = 'They are happy to be named and photographed'

/** True when the person has a staff picture on file (the table may not exist yet: then no). */
export async function staffHasPicture(tenantId: string, userId: string): Promise<boolean> {
  try {
    if (!(await staffPhotosReady())) return false
    return !!(await p().staffPhoto.findFirst({ where: { tenant_id: tenantId, user_id: userId }, select: { id: true } }))
  } catch { return false }
}

export type PersonLookup = { ok: true; id: string; name: string } | { ok: false; reason: string }
/** An active member of staff of this account, by id or by an exact full name. Never a shared login. A name that matches two people is refused: pick them from the list. */
export async function resolvePerson(tenantId: string, o: { user_id?: unknown; name?: unknown }): Promise<PersonLookup> {
  const id = typeof o.user_id === 'string' ? o.user_id.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (id) {
    const u = await p().user.findFirst({ where: { id, tenant_id: tenantId, is_active: true, is_shared: false }, select: { id: true, name: true } })
    return u ? { ok: true, id: u.id, name: u.name } : { ok: false, reason: 'That person was not found among your active staff.' }
  }
  if (name) {
    const list: any[] = await p().user.findMany({ where: { tenant_id: tenantId, is_active: true, is_shared: false, name: { equals: name, mode: 'insensitive' } }, select: { id: true, name: true }, take: 3 })
    if (list.length === 1) return { ok: true, id: list[0].id, name: list[0].name }
    return { ok: false, reason: list.length ? 'More than one person has that name. Ask the administrator to pick them from the staff list.' : 'No active member of staff has that name. Ask the administrator to pick them from the staff list.' }
  }
  return { ok: false, reason: 'Say who the person is.' }
}

export interface PhotoChoice { user_id: string; include: true; consent: true; consent_by: string; consent_at: string }
/** The record kept on the newsletter. Refused without consent, so a photo can never be set by accident. */
export function photoChoice(o: { userId: string; consent: unknown; actorId: string; now?: Date }): { ok: true; photo: PhotoChoice } | { ok: false; reason: string } {
  if (o.consent !== true) return { ok: false, reason: `A picture is only used when the person agrees. Ask "${CONSENT_QUESTION}" in the question form and only continue when the answer is yes.` }
  return { ok: true, photo: { user_id: o.userId, include: true, consent: true, consent_by: o.actorId, consent_at: (o.now ?? new Date()).toISOString() } }
}
