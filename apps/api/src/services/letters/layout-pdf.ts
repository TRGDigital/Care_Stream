// The PDF for a formal document: logo and the organisation's name and address at the top, the letter or report, the signature, and the legal footer and page numbers on every page.
// pdfkit and the policy PDF helpers (which prepare the logo) are loaded when this runs, the same pattern the other PDFs use, so the deployed function traces the fonts and everything else
// works without them.

import { footerFor, printable, type LayoutDoc } from './layout'
import { usableBrand } from '../../lib/brand-colour'

const M = 56, W = 595.28, H = 841.89
const INK = '#1A1530', MID = '#5E4D70', LINE = '#d9d4e0', GREY = '#777777', TEAL = '#0f766e'

/** Where each block landed, for the tests: which page it started and ended on. */
export interface PlacedBlock { i: number; t: string; startPage: number; endPage: number; text: string }

// HOUSE RULE 10 (document layout), letters and long documents: a paragraph is never split across two pages (it moves, whole, to the next page; only a paragraph longer than a page may split),
// a heading always stays with the start of the paragraph after it, the sign-off (closing, signature, name) stays with at least the last paragraph and is never alone on a page,
// a bullet or the acknowledgement box is never cut, there are no blank pages, the letterhead is in full on page 1 only (a small running header follows on later pages), and every
// page has "Page 2 of 3" when there is more than one.
export async function renderLayoutPdf(d: LayoutDoc, opts: { compress?: boolean; trace?: PlacedBlock[] } = {}): Promise<Buffer> {
  const [{ default: PDFDocument }, { logoForPdf }] = await Promise.all([import('pdfkit'), import('../policy/policy-pdf')])
  const logo = await logoForPdf(d.head.logoDataUrl ?? null)
  const BRAND = usableBrand(d.head.brandColour)   // the organisation's colour: header rule and headings only, never body text
  const foot = footerFor(d.head)
  const footH = foot.length ? foot.length * 9.5 + 14 : 0
  const width = W - M * 2
  const bottom = H - M - Math.max(24, footH + 10)       // content stops above the footer
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, compress: opts.compress !== false, info: { Title: printable(d.subject ?? d.head.name), Author: printable(d.head.name) } })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const pageNow = () => doc.bufferedPageRange().count - 1
  /** A new page: a small running header (the organisation and the subject) and the content starts below it. The full letterhead is on page 1 only. */
  const newPage = () => {
    doc.addPage()
    doc.fillColor(GREY).font('Helvetica').fontSize(8).text(printable(d.head.name), M, 28, { width: width / 2, lineBreak: false, ellipsis: true })
    if (d.subject) doc.text(printable(d.subject), M + width / 2, 28, { width: width / 2, align: 'right', lineBreak: false, ellipsis: true })
    doc.moveTo(M, 42).lineTo(W - M, 42).lineWidth(0.5).strokeColor(LINE).stroke()
    doc.y = M
  }
  const room = bottom - M   // the most that fits on a fresh page
  const ensure = (h: number) => { if (doc.y + h > bottom) newPage() }
  /** Keeps a piece together: if it does not fit in what is left of this page but would fit on a fresh one, it moves to the next page (a piece longer than a page may split). */
  const keepTogether = (h: number) => { if (doc.y + h > bottom && h <= room) newPage() }
  const hOf = (text: string, size: number, w: number, gap: number, font = 'Helvetica') => { doc.font(font).fontSize(size); return doc.heightOfString(printable(text), { width: w, lineGap: gap }) }
  const lineH = (size: number, gap: number) => size * 1.2 + gap

  // ── The header: logo, then the organisation's name, address and contact lines ──
  const top = doc.y
  const lines = [...(d.head.addressLines ?? []), ...(d.head.contactLines ?? [])].map(printable)
  const centre = d.head.logoAlign === 'centre'
  if (centre) {
    let y = top
    if (logo) { try { doc.image(logo, (W - 160) / 2, y, { fit: [160, 52], align: 'center' }); y += 58 } catch { /* no logo */ } }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12.5).text(printable(d.head.name), M, y, { width, align: 'center' })
    const addr = (d.head.addressLines ?? []).map(printable).join(', '), contact = (d.head.contactLines ?? []).map(printable).join('   |   ')
    if (addr) doc.fillColor(MID).font('Helvetica').fontSize(8.8).text(addr, M, doc.y + 1, { width, align: 'center' })
    if (contact) doc.fillColor(MID).font('Helvetica').fontSize(8.8).text(contact, M, doc.y + 0.5, { width, align: 'center' })
  } else {
    if (logo) { try { doc.image(logo, M, top, { fit: [150, 52] }) } catch { /* no logo */ } }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(printable(d.head.name), M, top + 1, { width, align: 'right' })
    for (const l of lines) doc.fillColor(MID).font('Helvetica').fontSize(8.8).text(l, M, doc.y + 0.5, { width, align: 'right' })
    doc.y = Math.max(doc.y, top + 58)
  }
  doc.moveDown(0.4)
  doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(BRAND ? 1.4 : 0.7).strokeColor(BRAND ?? LINE).stroke()
  doc.moveDown(1)

  const sizeOf = (t: string) => (t === 'h' ? (d.kind === 'letter' ? 11 : 13) : 10.5)
  /** One block. `next` is the block after it (a heading is kept with the start of that one); `extra` is more that must stay with this block on the same page (the sign-off after the last paragraph). */
  const body = (b: { t: string; text: string }, prev: { v: string | null }, next?: { t: string; text: string } | null, extra = 0) => {
    if (prev.v === 'li' && b.t !== 'li') doc.moveDown(0.45)
    prev.v = b.t
    const start = pageNow()
    if (b.t === 'li') {
      keepTogether(hOf(b.text, 10.5, width - 20, 2) + 8 + extra)
      const y = doc.y
      doc.fillColor(INK).font('Helvetica').fontSize(10.5).text('•', M + 6, y, { width: 12, lineBreak: false })
      doc.text(printable(b.text), M + 20, y, { width: width - 20, lineGap: 2 })
      doc.moveDown(0.25)
    } else if (b.t === 'h') {
      // a heading never ends a page: it travels with the first lines of what follows (the whole next paragraph when it is short)
      const own = hOf(b.text, sizeOf('h'), width, 0, 'Helvetica-Bold') + 14
      const follow = next ? (next.t === 'p' ? Math.min(hOf(next.text, 10.5, width, 2.5), lineH(10.5, 2.5) * 3) : hOf(next.text, 10.5, width - 20, 2)) + 8 : 0
      keepTogether(own + follow)
      doc.moveDown(0.4); doc.fillColor(BRAND ?? (d.kind === 'letter' ? INK : TEAL)).font('Helvetica-Bold').fontSize(sizeOf('h')).text(printable(b.text), M, doc.y, { width }); doc.moveDown(0.3)
    } else {
      keepTogether(hOf(b.text, 10.5, width, 2.5) + 9 + extra)
      doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(printable(b.text), M, doc.y, { width, lineGap: 2.5, align: 'left' })
      doc.moveDown(0.7)
    }
    opts.trace?.push({ i: opts.trace.length, t: b.t, startPage: start, endPage: pageNow(), text: b.text })
  }
  const prev = { v: null as string | null }

  if (d.kind === 'letter') {
    doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.date ?? ''), M, doc.y, { width })
    doc.moveDown(0.8)
    if (d.confidential) { doc.fillColor(MID).font('Helvetica-Bold').fontSize(8.5).text('PRIVATE AND CONFIDENTIAL', M, doc.y, { width, characterSpacing: 0.6 }); doc.moveDown(0.3) }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(printable(d.recipient?.name ?? ''), M, doc.y, { width })
    if (d.recipient?.role) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.recipient.role), M, doc.y, { width })
    for (const l of d.recipient?.addressLines ?? []) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(l), M, doc.y, { width })
    doc.moveDown(1)
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11.5).text(printable(d.subject ?? ''), M, doc.y, { width })
    doc.moveDown(0.8)
    const sig0 = d.signer?.signature ?? null
    const signOffH = 48 + (sig0 ? Math.min(51, (sig0.height * Math.min(170 / sig0.width, 51 / sig0.height)) || 51) : 40) + 40 + 14
    const lastIdx = (() => { for (let k = d.blocks.length - 1; k >= 0; k--) if (d.blocks[k].t !== 'h') return k; return -1 })()
    d.blocks.forEach((b, k) => body(b, prev, d.blocks[k + 1] ?? null, k === lastIdx ? signOffH : 0))   // the sign-off stays with at least the last paragraph

    // ── Sign off: the closing, the signature (or room for a signature by hand), then the printed name and job title ──
    const sig = d.signer?.signature ?? null
    const sigH = sig ? Math.min(51, (sig.height * Math.min(170 / sig.width, 51 / sig.height)) || 51) : 40
    ensure(48 + sigH + 40)
    doc.moveDown(0.3)
    doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(printable(d.closing ?? ''), M, doc.y, { width })
    doc.moveDown(0.5)
    if (sig) {
      try { doc.image(sig.png, M, doc.y, { fit: [170, 51] }); doc.y += sigH + 4 } catch { doc.moveDown(2.4) }
    } else doc.moveDown(2.4)
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(printable(d.signer?.name ?? ''), M, doc.y, { width })
    if (d.signer?.role) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.signer.role), M, doc.y, { width })

    if (d.acknowledgement) {
      keepTogether(130 + 24)
      doc.moveDown(1.6)
      const y = doc.y
      doc.rect(M, y, width, 108).lineWidth(0.7).strokeColor(LINE).stroke()
      doc.fillColor(INK).font('Helvetica').fontSize(10).text(printable(d.acknowledgement), M + 12, y + 10, { width: width - 24, lineGap: 2 })
      const ly = y + 80
      doc.moveTo(M + 12, ly).lineTo(M + 12 + 240, ly).lineWidth(0.6).strokeColor(MID).stroke()
      doc.moveTo(M + 280, ly).lineTo(M + width - 12, ly).stroke()
      doc.fillColor(MID).font('Helvetica').fontSize(8.5).text('Signed', M + 12, ly + 3, { lineBreak: false })
      doc.text('Date', M + 280, ly + 3, { lineBreak: false })
      doc.y = y + 116
    }
  } else {
    // A report or newsletter: a title block, then the content.
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(printable(d.subject ?? ''), M, doc.y, { width })
    doc.moveDown(0.3)
    if (d.date) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.date), M, doc.y, { width })
    if (d.subtitle) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.subtitle), M, doc.y, { width })
    doc.moveDown(1)
    d.blocks.forEach((b, k) => body(b, prev, d.blocks[k + 1] ?? null))
    if (d.signer?.name) {
      ensure(90)
      doc.moveDown(1)
      if (d.signer.signature) { try { doc.image(d.signer.signature.png, M, doc.y, { fit: [170, 51] }); doc.y += 55 } catch { /* skip */ } }
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(printable(d.signer.name), M, doc.y, { width })
      if (d.signer.role) doc.fillColor(MID).font('Helvetica').fontSize(10).text(printable(d.signer.role), M, doc.y, { width })
    }
  }

  // ── The footer and page numbers, on every page ──
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.page.margins.bottom = 0
    if (d.stamp) doc.fillColor('#B91C1C').font('Helvetica-Bold').fontSize(7.5).text(printable(d.stamp), M, H - 22, { width: width - 90, align: 'left', lineBreak: false, ellipsis: true })
    let y = H - 28 - footH
    if (foot.length) {
      doc.moveTo(M, y - 4).lineTo(W - M, y - 4).lineWidth(0.5).strokeColor(LINE).stroke()
      for (const l of foot) { doc.fillColor(GREY).font('Helvetica').fontSize(7.5).text(l, M, y, { width, align: 'center', lineBreak: false }); y += 9.5 }
    }
    if (range.count > 1) doc.fillColor(GREY).font('Helvetica').fontSize(7.5).text(`Page ${i + 1} of ${range.count}`, M, H - 22, { width, align: 'right', lineBreak: false })
  }
  doc.end()
  return done
}
