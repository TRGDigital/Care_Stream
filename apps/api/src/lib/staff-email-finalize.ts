// The staff email layout at send time. Builders leave markers (services/email/outbound.ts staffWrapper); this fills them for the recipient:
// the headline (the subject), the person the email is from (picture, name, role, home), the footer note, and the From name ("Name via CareStream").
// The person is the acting administrator when an email names one (those use the person-led layout directly), otherwise the account's main
// administrator: the longest standing active one. Recipients who are not users of any account get the layout without a person.

import { prisma } from '../db/client'
import { resolveActor, previewActorActive } from '../services/email/email-avatar'
import { personBlockRows, personFrom, escapeHtml, type PersonAdmin } from '../services/email/person-email'
import { STAFF_MARK } from '../services/email/outbound'

const p = () => prisma as any
let forced: string | null = null   // the "send me a sample" action shows the person asking, so the sample carries their real name and picture
let forcedPrefix = ''
export async function withForcedPerson<T>(userId: string, subjectPrefix: string, fn: () => Promise<T>): Promise<T> {
  forced = userId; forcedPrefix = subjectPrefix
  try { return await fn() } finally { forced = null; forcedPrefix = '' }
}

const memo = new Map<string, { at: number; v: PersonAdmin | null }>()
const MEMO_MS = 5 * 60_000

async function mainAdminFor(recipient: string): Promise<PersonAdmin | null> {
  if (previewActorActive()) return resolveActor('preview-main-admin')
  if (forced) return resolveActor(forced)
  const key = recipient.trim().toLowerCase()
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.v
  let v: PersonAdmin | null = null
  try {
    const u = await p().user.findFirst({ where: { email: { equals: key, mode: 'insensitive' } }, select: { tenant_id: true } })
    if (u?.tenant_id) {
      const a = await p().user.findFirst({ where: { tenant_id: u.tenant_id, role: 'admin', is_active: true, is_shared: false }, orderBy: { created_at: 'asc' }, select: { id: true } })
      if (a?.id) v = await resolveActor(a.id)
    }
  } catch { v = null }
  memo.set(key, { at: Date.now(), v })
  return v
}

const firstRecipient = (to: unknown): string | null => {
  const one = Array.isArray(to) ? to[0] : to
  const e = typeof one === 'string' ? one : (one as any)?.email
  return typeof e === 'string' && e.includes('@') ? e : null
}

export async function finalizeStaffEmail(input: any): Promise<any> {
  // A sample (see routes/email-samples.ts) says so in the subject, on every layout.
  const msg = forcedPrefix && input && typeof input === 'object' && typeof input.subject === 'string' ? { ...input, subject: forcedPrefix + input.subject } : input
  if (!msg || typeof msg !== 'object' || typeof msg.html !== 'string' || !msg.html.includes(STAFF_MARK.headline)) return msg
  const to = firstRecipient(msg.to ?? msg.personalizations?.[0]?.to)
  const admin = to ? await mainAdminFor(to).catch(() => null) : null
  const headline = String(msg.subject ?? '').replace(/^\[(preview|test|sample)\]\s*/i, '')
  const note = admin?.homeName
    ? `You received this email from ${admin.homeName} through CareStream. If you were not expecting it, please speak to your manager.`
    : 'You received this email through CareStream. If you were not expecting it, please speak to your manager.'
  const html = msg.html
    .split(STAFF_MARK.headline).join(escapeHtml(headline))
    .split(STAFF_MARK.person).join(admin ? personBlockRows(admin) : '')
    .split(STAFF_MARK.note).join(escapeHtml(note))
  const fromEmail = typeof msg.from === 'string' ? msg.from : msg.from?.email
  return { ...msg, html, ...(admin && fromEmail ? { from: { email: fromEmail, name: personFrom(admin) } } : {}) }
}
