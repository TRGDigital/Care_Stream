// A saved Ask document (letter, newsletter, report) as a formal, headed document: PDF, Word, or an on screen preview. One layout feeds all three so they match.
// The organisation's letterhead and legal footer come from Settings (services/letters/letterhead.ts); the trading name is used in the letter, never the account's display name.
// A SIGNATURE is applied only when `signerUserId` is given, and the routes pass only the signed in person who chose "Sign with my signature" for this action.

import { loadLetterhead } from '../letters/letterhead'
import { layout as letterLayoutFor, renderPdf as letterPdf, renderDocx as letterDocx } from '../letters'
import { loadSignatureFor, signerIdentity } from '../letters/signatures'
import { layoutToHtml, parseBlocks, PREVIEW_CSS, type LayoutDoc } from '../letters/layout'

export interface Doc { id: string; type: string; title: string; body: string; data: any }
export const DOCUMENT_TYPES_WITH_FILES = ['letter', 'newsletter', 'report']

import { prisma } from '../../db/client'
/** The name of the person sending (for the newsletter footer). */
export async function nameOf(userId?: string | null): Promise<string | null> {
  if (!userId) return null
  try { const u = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true } }); return u?.name ?? null } catch { return null }
}
const safeName = (s: string) => s.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document'
const ukDate = (d = new Date()) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

/** The letter's service name, with the trading name instead of the account's display name. A name the person typed themselves is left alone. */
export function withTradingName(values: Record<string, unknown>, displayName: string, tradingName: string): Record<string, unknown> {
  const cur = String(values?.service_name ?? '').trim()
  if (tradingName && (!cur || cur === displayName)) return { ...values, service_name: tradingName }
  return values
}

async function signerFor(tenantId: string, signerUserId?: string | null) {
  if (!signerUserId) return null
  const id = await signerIdentity(tenantId, signerUserId)
  if (!id) return null
  return { name: id.name, role: id.role, signature: await loadSignatureFor(tenantId, signerUserId) }
}

export async function buildLayout(o: { tenantId: string; doc: Doc; signerUserId?: string | null }): Promise<{ layout: LayoutDoc; logoDataUrl: string | null; file: string; head: Awaited<ReturnType<typeof loadLetterhead>>['head']; values?: Record<string, unknown> }> {
  const l = await loadLetterhead(o.tenantId)
  const signer = await signerFor(o.tenantId, o.signerUserId)
  const file = safeName(o.doc.title)
  if (o.doc.type === 'letter') {
    const values = withTradingName(o.doc.data?.values ?? {}, l.displayName, l.details?.trading_name ?? '')
    return { layout: letterLayoutFor(String(o.doc.data?.template_id ?? ''), values as any, l.head, signer), logoDataUrl: l.head.logoDataUrl ?? null, file, head: l.head, values }
  }
  if (o.doc.type === 'newsletter' || o.doc.type === 'report') {
    const layout: LayoutDoc = {
      kind: o.doc.type, head: l.head, subject: o.doc.title, date: ukDate(), subtitle: o.doc.type === 'newsletter' ? 'Staff newsletter' : undefined,
      blocks: parseBlocks(o.doc.body), signer: o.doc.type === 'report' && signer ? signer : undefined,
    }
    return { layout, logoDataUrl: l.head.logoDataUrl ?? null, file, head: l.head }
  }
  throw new Error('That kind of document has no printed version.')
}

/** A copy that is not final says so on every page: an administrator can save or print a draft, and it is stamped. */
export const DRAFT_STAMP = 'DRAFT: not yet approved. Do not share.'
export async function renderDocument(o: { tenantId: string; doc: Doc; format: 'pdf' | 'docx'; signerUserId?: string | null; sentByUserId?: string | null; stamp?: string }): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  const b = await buildLayout(o)
  const ext = o.format
  const mime = o.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (o.doc.type === 'letter') {
    const signer = b.layout.signer?.signature !== undefined && o.signerUserId ? b.layout.signer : null
    const make = o.format === 'pdf' ? letterPdf : letterDocx    // these refuse to print a letter that is not finished
    const buffer = await make(String(o.doc.data?.template_id ?? ''), (b.values ?? {}) as any, b.head, signer ? { name: signer.name, role: signer.role, signature: signer.signature ?? null } : null, o.stamp)
    return { buffer, filename: `${b.file}.${ext}`, mime }
  }
  if (o.format === 'pdf' && o.doc.type === 'newsletter') {   // a newsletter is DESIGNED: the same design as the email and the screen
    const { designedPdf } = await import('./newsletter-design-doc')
    return { buffer: await designedPdf({ tenantId: o.tenantId, doc: o.doc, sentBy: await nameOf(o.sentByUserId), stamp: o.stamp }), filename: `${b.file}.pdf`, mime }
  }
  if (o.format === 'pdf') { const { renderLayoutPdf } = await import('../letters/layout-pdf'); return { buffer: await renderLayoutPdf(o.stamp ? { ...b.layout, stamp: o.stamp } : b.layout), filename: `${b.file}.pdf`, mime } }
  const { renderLayoutDocx } = await import('../letters/layout-docx')
  return { buffer: await renderLayoutDocx(o.stamp ? { ...b.layout, stamp: o.stamp } : b.layout), filename: `${b.file}.docx`, mime }
}

/** The headed page as HTML and its CSS, for the preview in the Ask panel. Works on an unfinished letter (gaps show as [Label]). */
export async function previewHtml(o: { tenantId: string; doc: Doc; signerUserId?: string | null; sentByUserId?: string | null; draft?: { title?: string; body?: string } }): Promise<{ html: string; css: string; designed?: boolean }> {
  if (o.doc.type === 'newsletter') {
    const { designedHtml } = await import('./newsletter-design-doc')
    return { html: await designedHtml({ tenantId: o.tenantId, doc: o.doc, target: 'web', sentBy: await nameOf(o.sentByUserId), draft: o.draft }), css: '', designed: true }
  }
  const b = await buildLayout(o)
  return { html: layoutToHtml(b.layout, b.logoDataUrl), css: PREVIEW_CSS }
}
