// Sharing an APPROVED letter or newsletter: a PDF download, an email to the person (letters), or a staff notification with the PDF attached. Every path is audit logged by the caller.
// ADMIN ONLY: the caller (routes/ask.ts) is admin guarded and has already checked the document is approved.
import { prisma } from '../../db/client'
import { randomUUID } from 'crypto'
import { renderPdf, type Letterhead } from '../letters'
import { renderNewsletterPdf } from './pdf'
import { putPrivateObject } from '../storage/s3'
import { detectNotificationFile } from '../../lib/notification-file'
import { createAndSendNotification } from '../../routes/notifications'
import { sendStaffDocumentEmail } from '../email/outbound'
import { cleanTitle, cleanBody } from '../../lib/staff-notifications'

const p = () => prisma as any
export interface Doc { id: string; type: string; title: string; body: string; data: any }

async function letterhead(tenantId: string): Promise<Letterhead> {
  const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true, logo_url: true } })
  return { name: t?.name ?? 'Your service', logoDataUrl: typeof t?.logo_url === 'string' && /^data:image\//.test(t.logo_url) ? t.logo_url : null }
}
const safeName = (s: string) => s.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document'
const ukDate = (d = new Date()) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

/** The finished PDF for an approved document. A letter refuses to print while anything is missing (the letters module checks). */
export async function pdfFor(tenantId: string, doc: Doc): Promise<{ buffer: Buffer; filename: string }> {
  const head = await letterhead(tenantId)
  if (doc.type === 'letter') {
    const buffer = await renderPdf(String(doc.data?.template_id ?? ''), doc.data?.values ?? {}, head)
    return { buffer, filename: `${safeName(doc.title)}.pdf` }
  }
  if (doc.type === 'newsletter') return { buffer: await renderNewsletterPdf({ title: doc.title, body: doc.body, head, dateText: ukDate() }), filename: `${safeName(doc.title)}.pdf` }
  if (doc.type === 'report') return { buffer: await renderNewsletterPdf({ title: doc.title, body: doc.body, head, dateText: ukDate(), label: doc.data?.internal_only === true ? 'Governance report, internal only' : 'Governance report' }), filename: `${safeName(doc.title)}.pdf` }
  throw new Error('That kind of document has no PDF.')
}

/** Emails an approved letter to the person it is for, as a PDF, from the administrator sharing it. */
export async function emailLetter(o: { tenantId: string; actorId: string; doc: Doc }): Promise<{ sent: boolean; reason?: string }> {
  const staffId = String(o.doc.data?.staff_user_id ?? '')
  const person = await p().user.findFirst({ where: { id: staffId, tenant_id: o.tenantId, is_active: true }, select: { name: true, email: true } })
  if (!person?.email) return { sent: false, reason: 'That person has no email address on record.' }
  const [{ buffer, filename }, tenant] = await Promise.all([pdfFor(o.tenantId, o.doc), p().tenant.findUnique({ where: { id: o.tenantId }, select: { name: true } })])
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
export async function shareAsNotification(o: { tenantId: string; actorId: string; doc: Doc; audience?: unknown; userIds?: unknown }) {
  // An internal only report may name people and can NEVER go to staff, whatever the caller asked for.
  if (o.doc.type === 'report' && o.doc.data?.internal_only === true) throw new Error('An internal only report cannot be sent to staff.')
  const { buffer, filename } = await pdfFor(o.tenantId, o.doc)
  const found = detectNotificationFile(buffer, filename)
  if (!found.ok) throw new Error(found.reason)
  const id = randomUUID(), key = `tenants/${o.tenantId}/notification-files/${id}.${found.ext}`
  await putPrivateObject(key, buffer, found.mime)
  const file = await p().staffNotificationFile.create({ data: { id, tenant_id: o.tenantId, name: filename, mime: found.mime, size_bytes: buffer.length, storage_key: key, scan_status: 'skipped', created_by: o.actorId } })
  const isLetter = o.doc.type === 'letter'
  const title = cleanTitle(isLetter ? `A letter for you: ${String(o.doc.data?.template_id ? o.doc.title.replace(/:.*$/, '') : o.doc.title)}` : o.doc.title, 120)
  const body = cleanBody(isLetter ? 'Your letter is attached. Please open it and keep it with your records.' : (o.doc.type === 'report' ? 'The report is attached as a PDF.' : o.doc.body.length <= 1900 ? o.doc.body : 'This month\'s staff newsletter is attached as a PDF.'), 2000)
  const userIds = isLetter ? [String(o.doc.data?.staff_user_id ?? '')] : o.userIds
  return createAndSendNotification({ tenantId: o.tenantId, userId: o.actorId, title, body, audience: isLetter ? 'selected' : (o.audience === 'selected' ? 'selected' : 'all'), userIds, files: [file] })
}
