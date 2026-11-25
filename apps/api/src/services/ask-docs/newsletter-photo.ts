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

/** The featured people on a newsletter, each with a recorded agreement: the list `photos`, or the old single `photo` read as a list of one. Anything without consent is dropped. */
export function featuredOf(data: any): PhotoChoice[] {
  const list: any[] = Array.isArray(data?.photos) ? data.photos : data?.photo ? [data.photo] : []
  const seen = new Set<string>()
  return list.filter(x => x && x.include === true && x.consent === true && typeof x.user_id === 'string' && x.user_id && !seen.has(x.user_id) && !!seen.add(x.user_id)).slice(0, 8)
}
export const MAX_FEATURED = 8

// The optional GIFT for the featured people (employee of the month, a staff story, recognition): words, and a small picture kept privately per account. Optional means optional: no gift, no card.
export const GIFT_TYPES = new Set(['employee-of-the-month', 'staff-stories', 'recognition'])
export const giftAllowedFor = (templateId: string | null | undefined): boolean => GIFT_TYPES.has(String(templateId ?? '').replace(/-(short|standard|detailed)$/, ''))
export const GIFT_MAX_BYTES = 1024 * 1024
export const GIFT_IMAGE_ID = /^[a-f0-9-]{36}\.(png|jpg|webp)$/
export const giftKey = (tenantId: string, imageId: string) => `tenants/${tenantId}/gift-images/${imageId}`
/** What the first bytes say the picture is. The browser's word for it is never trusted. */
export function detectGiftImage(buf: Buffer): { ext: 'png' | 'jpg' | 'webp'; mime: string } | null {
  if (buf.length < 12) return null
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { ext: 'png', mime: 'image/png' }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  return null
}
/** The gift words follow the newsletter rules (no dashes, no health, absence or discipline, no ages) except that a pound value IS allowed here, because a gift has a value ("a gift value is allowed here"). Pay figures stay refused everywhere else. */
export function lintGift(text: string): string[] {
  const out: string[] = []
  const t = String(text ?? '')
  if (t.length > 200) out.push('The gift description is over 200 characters. Keep it short.')
  if (/[–—]/.test(t)) out.push('The gift description contains a dash. Use commas, full stops or the word "to" instead.')
  if (/\b(sick|sickness|ill|illness|unwell|absence|absent|diagnos\w*|medical|disciplin\w*|capability|grievance|warning)\b/i.test(t)) out.push('The gift description mentions health, absence or discipline. A staff newsletter must not.')
  if (/\b(salary|pay rise|per hour|an hour|hourly rate|bonus)\b/i.test(t)) out.push('The gift description sounds like pay. A gift can be a voucher, extra leave or something similar, not pay.')
  if (/\b(aged\s+\d+|turns?\s+\d+|\d+\s+years?\s+old)\b/i.test(t)) out.push('The gift description mentions someone\'s age.')
  return out
}
