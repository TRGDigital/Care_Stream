// Sharing an APPROVED letter or newsletter: a PDF download, an email to the person (letters), or a staff notification with the PDF attached. Every path is audit logged by the caller.
// ADMIN ONLY: the caller (routes/ask.ts) is admin guarded and has already checked the document is approved.
import { prisma } from '../../db/client'
import { randomUUID } from 'crypto'
import { renderDocument, nameOf } from './render-doc'
import { loadLetterhead } from '../letters/letterhead'
import { putPrivateObject } from '../storage/s3'
import { detectNotificationFile } from '../../lib/notification-file'
import { createAndSendNotification } from '../../routes/notifications'
import { sendStaffDocumentEmail } from '../email/outbound'
import { cleanTitle, cleanBody } from '../../lib/staff-notifications'
import { shareToHub, setNotificationFor, isMissingTable as lettersMissingTable } from '../../lib/staff-letters'
import { defaultNeedsAcknowledgement } from './share-intent'

const p = () => prisma as any
export interface Doc { id: string; type: string; title: string; body: string; data: any }

const safeName = (s: string) => s.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document'
const ukDate = (d = new Date()) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

/** The finished PDF for an approved document, on the organisation's letterhead. A letter refuses to print while anything is missing. The signature is added only for `signerUserId`. */
export async function pdfFor(tenantId: string, doc: Doc, signerUserId?: string | null, sentByUserId?: string | null, stamp?: string): Promise<{ buffer: Buffer; filename: string }> {
  const r = await renderDocument({ tenantId, doc, format: 'pdf', signerUserId, sentByUserId, stamp })
  return { buffer: r.buffer, filename: r.filename }
}

/** The same document as a Word file. */
export async function docxFor(tenantId: string, doc: Doc, signerUserId?: string | null, stamp?: string): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  return renderDocument({ tenantId, doc, format: 'docx', signerUserId, stamp })
}

/** Emails an approved letter to the person it is for, as a PDF, from the administrator sharing it. */
export async function emailLetter(o: { tenantId: string; actorId: string; doc: Doc; signerUserId?: string | null }): Promise<{ sent: boolean; reason?: string }> {
  const staffId = String(o.doc.data?.staff_user_id ?? '')
  const person = await p().user.findFirst({ where: { id: staffId, tenant_id: o.tenantId, is_active: true }, select: { name: true, email: true } })
  if (!person?.email) return { sent: false, reason: 'That person has no email address on record.' }
  const [{ buffer, filename }, tenant] = await Promise.all([pdfFor(o.tenantId, o.doc, o.signerUserId), loadLetterhead(o.tenantId).then(l => ({ name: l.head.name }))])
  await sendStaffDocumentEmail({ to: person.email, name: person.name, orgName: tenant?.name ?? 'Your service', actorUserId: o.actorId, subject: o.doc.title.replace(/:.*$/, '').trim() || 'A letter for you', intro: 'Here is your letter.', attachmentName: filename, pdf: buffer })
  return { sent: true }
}

/** Emails an approved governance report, as a PDF, to every active administrator of the account (never to anyone else), from the administrator sharing it. */
export async function emailReportToAdmins(o: { tenantId: string; actorId: string; doc: Doc }): Promise<{ sent: number; reason?: string }> {
  const admins: Array<{ name: string; email: string | null }> = await p().user.findMany({ where: { tenant_id: o.tenantId, role: 'admin', is_active: true, is_shared: false }, select: { name: true, email: true } })
  const to = admins.filter(a => a.email)
  if (!to.length) return { sent: 0, reason: 'No administrator has an email address on record.' }
  const [{ buffer, filename }, tenant] = await Promise.all([pdfFor(o.tenantId, o.doc), p().tenant.findUnique({ where: { id: o.tenantId }, select: { name: true } })])
  let sent = 0
  for (const a of to) {
    try { await sendStaffDocumentEmail({ to: a.email as string, name: a.name, orgName: tenant?.name ?? 'Your service', actorUserId: o.actorId, subject: o.doc.title.slice(0, 120) || 'A governance report', intro: o.doc.data?.internal_only === true ? 'A governance report for the administrators is attached. It is marked internal only.' : 'A governance report is attached.', attachmentName: filename, pdf: buffer, noun: 'report' }); sent++ } catch { /* one address failing does not stop the others */ }
  }
  return sent ? { sent } : { sent: 0, reason: 'The email could not be sent just now.' }
}

/** Sends an approved document as a staff notification with its PDF attached. A letter goes to the one person it is for; a newsletter goes to everyone or the chosen staff. */
export async function shareAsNotification(o: { tenantId: string; actorId: string; doc: Doc; audience?: unknown; userIds?: unknown; signerUserId?: string | null; email?: boolean }) {
  // An internal only report may name people and can NEVER go to staff, whatever the caller asked for.
  if (o.doc.type === 'report' && o.doc.data?.internal_only === true) throw new Error('An internal only report cannot be sent to staff.')
  const { buffer, filename } = await pdfFor(o.tenantId, o.doc, o.signerUserId, o.actorId)
  const found = detectNotificationFile(buffer, filename)
  if (!found.ok) throw new Error(found.reason)
  const id = randomUUID(), key = `tenants/${o.tenantId}/notification-files/${id}.${found.ext}`
  await putPrivateObject(key, buffer, found.mime)
  const file = await p().staffNotificationFile.create({ data: { id, tenant_id: o.tenantId, name: filename, mime: found.mime, size_bytes: buffer.length, storage_key: key, scan_status: 'skipped', created_by: o.actorId } })
  const isLetter = o.doc.type === 'letter'
  const title = cleanTitle(isLetter ? `A letter for you: ${String(o.doc.data?.template_id ? o.doc.title.replace(/:.*$/, '') : o.doc.title)}` : o.doc.title, 120)
  const body = cleanBody(isLetter ? 'Your letter is attached. Please open it and keep it with your records.' : (o.doc.type === 'report' ? 'The report is attached as a PDF.' : o.doc.body.length <= 1900 ? o.doc.body : 'This month\'s staff newsletter is attached as a PDF.'), 2000)
  const userIds = isLetter ? [String(o.doc.data?.staff_user_id ?? '')] : o.userIds
  // A newsletter goes out DESIGNED: the email carries the designed newsletter, and the hub shows it too (the plain text stays as the notification text).
  let emailHtml: string | undefined, hubHtml: string | undefined
  if (o.doc.type === 'newsletter') {
    try {
      const { designedHtml } = await import('./newsletter-design-doc')
      const sentBy = await nameOf(o.actorId)
      ;[emailHtml, hubHtml] = await Promise.all([designedHtml({ tenantId: o.tenantId, doc: o.doc, target: 'email', sentBy }), designedHtml({ tenantId: o.tenantId, doc: o.doc, target: 'web', sentBy })])
    } catch { emailHtml = undefined; hubHtml = undefined }   // the plain notification and the PDF still go
  }
  return createAndSendNotification({ tenantId: o.tenantId, userId: o.actorId, title, body, audience: isLetter ? 'selected' : (o.audience === 'selected' ? 'selected' : 'all'), userIds, files: [file], emailHtml, hubHtml, ...(o.email === false ? { email: false } : {}) })
}

/**
 * Shares an approved letter in the staff member's hub (My letters). The finished, headed PDF is rendered ONCE here and kept as a private snapshot, so editing the draft or the letterhead
 * later never changes what the person received. The signature is applied only for `signerUserId` (the administrator who ticked "Sign with my signature"). A hub notification
 * ("You have a new letter from ...") is created too, hub only: the email, if the administrator also chose it, is the separate emailLetter step. Print only letters never come here.
 */
export async function shareInHub(o: { tenantId: string; actorId: string; doc: Doc; signerUserId?: string | null; needsAcknowledgement?: boolean }):
  Promise<{ ok: true; letter_id: string; notified: boolean; needs_acknowledgement: boolean } | { ok: false; reason: string; code?: string }> {
  if (o.doc.type !== 'letter') return { ok: false, reason: 'Only a letter can be shared in a staff member\'s hub.' }
  if (o.doc.data?.share_intent?.print_only === true) return { ok: false, reason: 'This letter is marked print only, so it is never shared in the hub. Change how it is shared first.' }
  const staffId = String(o.doc.data?.staff_user_id ?? '')
  const person = await p().user.findFirst({ where: { id: staffId, tenant_id: o.tenantId, is_active: true, is_shared: false }, select: { id: true, name: true } })
  if (!person) return { ok: false, reason: 'That person is not an active member of staff, so the letter cannot be shared in their hub.' }
  const needsAck = typeof o.needsAcknowledgement === 'boolean' ? o.needsAcknowledgement : defaultNeedsAcknowledgement(String(o.doc.data?.template_id ?? ''), o.doc.data?.values ?? {})
  const sender = await p().user.findUnique({ where: { id: o.actorId }, select: { name: true } })
  const senderName = sender?.name ?? 'An administrator'
  const { buffer, filename } = await pdfFor(o.tenantId, o.doc, o.signerUserId)
  let letterId: string
  try {
    letterId = await shareToHub({ tenantId: o.tenantId, documentId: o.doc.id, userId: person.id, title: o.doc.title.replace(/:.*$/, '').trim() || 'A letter for you', filename, pdf: buffer, signed: !!o.signerUserId, sentBy: o.actorId, sentByName: senderName, needsAcknowledgement: needsAck })
  } catch (e) { return lettersMissingTable(e) ? { ok: false, reason: 'Letters in the hub are not switched on yet.', code: 'NOT_SET_UP' } : { ok: false, reason: 'The letter could not be shared in the hub just now. Please try again.' } }
  let notified = false
  try {
    const title = cleanTitle(`You have a new letter from ${senderName}`, 120)
    const body = cleanBody(`${o.doc.title.replace(/:.*$/, '').trim() || 'A letter'} is waiting in My letters in your hub. You can read it, print it or download it there.${needsAck ? ' Please tick that you have read and understood it.' : ''}`, 1900)
    const n = await createAndSendNotification({ tenantId: o.tenantId, userId: o.actorId, title, body, audience: 'selected', userIds: [person.id], files: [], email: false, skipDailyLimit: true })
    if (n.ok) { notified = true; await setNotificationFor(o.tenantId, letterId, n.id) }
  } catch { /* the letter is shared even if the notification could not be made */ }
  return { ok: true, letter_id: letterId, notified, needs_acknowledgement: needsAck }
}
