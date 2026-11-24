// A PDF for a staff newsletter on the service's letterhead (letters have their own renderer in services/letters). pdfkit and the policy PDF helpers are loaded when this is called,
// the same pattern the letters use, so the deployed function traces the fonts and everything else works without them.
import type { Letterhead } from '../letters'

const pdfSafe = (s: string) => s.normalize('NFC').replace(/[‘’]/g, '’').replace(/[^\u0009\u000A -~ -ÿ’“”…•€]/g, '')

export interface PdfBlock { t: 'h' | 'p' | 'li'; text: string }
/** Plain text with ## headings and - bullets, as the newsletter agent writes it. */
export function parseBlocks(body: string): PdfBlock[] {
  const out: PdfBlock[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ').trim() }); para = [] } }
  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const h = /^#{1,3}\s+(.*)$/.exec(line), li = /^[-*]\s+(.*)$/.exec(line)
    if (h) { flush(); out.push({ t: 'h', text: h[1].trim() }) } else if (li) { flush(); out.push({ t: 'li', text: li[1].trim() }) } else para.push(line)
  }
  flush()
  return out
}

export async function renderNewsletterPdf(o: { title: string; body: string; head: Letterhead; dateText: string; label?: string }): Promise<Buffer> {
  const [{ default: PDFDocument }, { logoForPdf }] = await Promise.all([import('pdfkit'), import('../policy/policy-pdf')])
  const logo = await logoForPdf(o.head.logoDataUrl ?? null)
  const M = 56, W = 595.28, H = 841.89, width = W - M * 2
  const INK = '#1A1530', MID = '#5E4D70', LINE = '#d9d4e0', TEAL = '#0f766e'
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: pdfSafe(o.title), Author: pdfSafe(o.head.name) } })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const ensure = (h: number) => { if (doc.y + h > H - M - 20) doc.addPage() }
  const top = doc.y
  if (logo) { try { doc.image(logo, M, top, { fit: [150, 48] }) } catch { /* no logo */ } }
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(pdfSafe(o.head.name), M, top + 2, { width, align: 'right' })
  doc.fillColor(MID).font('Helvetica').fontSize(9).text(pdfSafe(o.label ?? 'Staff newsletter'), M, doc.y + 1, { width, align: 'right' })
  doc.y = Math.max(doc.y, top + 54)
  doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(0.7).strokeColor(LINE).stroke()
  doc.moveDown(1)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(pdfSafe(o.title), M, doc.y, { width })
  doc.moveDown(0.3)
  doc.fillColor(MID).font('Helvetica').fontSize(10).text(pdfSafe(o.dateText), M, doc.y, { width })
  doc.moveDown(1)
  for (const b of parseBlocks(o.body)) {
    if (b.t === 'h') { ensure(46); doc.moveDown(0.5); doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(13).text(pdfSafe(b.text), M, doc.y, { width }); doc.moveDown(0.3) }
    else if (b.t === 'li') { ensure(18); const y = doc.y; doc.fillColor(INK).font('Helvetica').fontSize(10.5).text('•', M + 6, y, { width: 12, lineBreak: false }); doc.text(pdfSafe(b.text), M + 20, y, { width: width - 20, lineGap: 2 }); doc.moveDown(0.25) }
    else { ensure(30); doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(pdfSafe(b.text), M, doc.y, { width, lineGap: 2.5 }); doc.moveDown(0.7) }
  }
  const range = doc.bufferedPageRange()
  if (range.count > 1) for (let i = 0; i < range.count; i++) { doc.switchToPage(range.start + i); doc.page.margins.bottom = 0; doc.fillColor(MID).font('Helvetica').fontSize(8).text(`Page ${i + 1} of ${range.count}`, M, H - 32, { width, align: 'center', lineBreak: false }) }
  doc.end()
  return done
}
