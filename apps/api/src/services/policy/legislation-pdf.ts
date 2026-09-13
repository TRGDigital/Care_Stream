// The companion document: what this policy was written against.
//
// Everything the pipeline knows about a policy's grounding has lived in the platform admin,
// where the customer cannot see it. They receive a policy and are asked to take the rest on
// trust, which is the one thing a compliance product should never ask.
//
// This is that working, in their hands: the legislation, what each instrument requires, why
// it matters in a care setting, the elements the policy had to contain, and the CQC quality
// statements an inspector would assess it under. It is rendered from recorded data, so it
// costs no credit and cannot invent a citation.
//
// TWO RULES ABOUT WHAT GOES IN IT.
//
// Only elements the coverage judge found MET. A customer-facing document listing what their
// own policy fails to address would be an own goal: it is handed to inspectors. The gate
// already blocks delivery on unmet elements, so by the time this is generated there should
// be none -- and if there are, they belong in the platform checklist, not here.
//
// It never claims CQC approval. CQC does not approve or certify policies from any provider,
// and a document implying otherwise would be worse than useless to the home holding it.

import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import 'pdfkit/standard-fonts/TimesRoman'
import 'pdfkit/standard-fonts/TimesBold'
import 'pdfkit/standard-fonts/TimesItalic'
import 'pdfkit/standard-fonts/Helvetica'
import 'pdfkit/standard-fonts/HelveticaBold'
import 'pdfkit/standard-fonts/HelveticaOblique'
import type { PolicyProvenance } from '../policy-writer/policy-provenance'

const MARGIN = { top: 56, bottom: 76, left: 56, right: 56 }

// The CareStream palette, from the web app's Tailwind config. This document is ours: it is
// our account of how we built their policy, not a letterhead for them to send out, so it
// carries our mark and our colours and says plainly who wrote what.
const BRAND = {
  accent: '#9B52B5',
  accentDark: '#7A3D9A',
  accentSoft: '#F5EEFA',
  ink: '#1A1530',
  muted: '#5E4D70',
  rule: '#E8DFF0',
}

const CARESTREAM = {
  url: 'www.carestreamai.com',
  email: 'hello@carestreamai.com',
  legal: 'CareStreamAI is a product of TRG Digital Ltd, registered in England and Wales (company no. 11731704).',
  address: 'Registered office: Suite Ra01, 195-197 Wood Street, London, E17 3NU.',
}

// The logo is a 4336px PNG in the web app. Resized once per process rather than per page:
// a hundred-kilobyte image redrawn on every footer of every document is waste nobody sees
// until the PDFs get slow.
let logoCache: { header: Buffer; footer: Buffer } | null = null
async function careStreamLogo(): Promise<{ header: Buffer; footer: Buffer } | null> {
  if (logoCache) return logoCache
  for (const candidate of [
    path.resolve(process.cwd(), 'apps/web/public/logo-color.png'),
    path.resolve(process.cwd(), '../web/public/logo-color.png'),
    path.resolve(__dirname, '../../../../web/public/logo-color.png'),
  ]) {
    try {
      const raw = await fs.readFile(candidate)
      logoCache = {
        header: await sharp(raw).resize({ width: 420, withoutEnlargement: true }).png().toBuffer(),
        footer: await sharp(raw).resize({ width: 200, withoutEnlargement: true }).png().toBuffer(),
      }
      return logoCache
    } catch { /* try the next path */ }
  }
  // A missing logo must not cost them the document, but it should not be silent either.
  console.warn('[legislation-pdf] CareStream logo not found; continuing without it')
  return null
}

/** The first few sentences, to a sensible length, cut on a sentence boundary.
 *
 *  The curated summaries are written for the writer and the coverage judge, which want every
 *  nuance: the Accessible Information Standard's runs to three thousand characters and its
 *  care-home context to four thousand. Printed in full, two regulations become a ten page
 *  document, and a ten page explainer is one nobody reads -- which defeats the point of
 *  handing it to them at all. The full text stays where it is useful, on the platform. */
function brief(text: string, limit = 420): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= limit) return t
  const cut = t.slice(0, limit)
  // Prefer a sentence end; fall back to a word boundary rather than mid-word.
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
  if (stop > limit * 0.5) return cut.slice(0, stop + 1)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '') + '…'
}

const KEY_QUESTION: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring',
  responsive: 'Responsive', 'well-led': 'Well-led', wellled: 'Well-led',
}

export interface LegislationPdfOrg {
  home_name?: string | null
  address?: string | null
  logo?: Buffer | null
}

export async function buildLegislationPdf(opts: {
  provenance: PolicyProvenance
  org: LegislationPdfOrg | null
  version?: string
}): Promise<Buffer> {
  const { provenance: p, org } = opts
  const doc = new PDFDocument({ size: 'A4', margins: MARGIN, bufferPages: true, autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', c => chunks.push(c as Buffer))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const width = doc.page.width - MARGIN.left - MARGIN.right
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  /** Start a new page before a block that would otherwise be orphaned at the foot. */
  const room = (needed: number) => {
    if (doc.y + needed > doc.page.height - MARGIN.bottom) doc.addPage()
  }

  const logo = await careStreamLogo()

  // ── header: our mark, not theirs ────────────────────────────────────────────
  let y = MARGIN.top
  if (logo) {
    try { doc.image(logo.header, MARGIN.left, y, { fit: [150, 42] }); y += 50 }
    catch (e: any) { console.warn(`[legislation-pdf] logo could not be drawn (${e?.message})`) }
  }

  doc.font('Helvetica-Bold').fontSize(20).fillColor(BRAND.ink)
    .text(`${p.policy_title}`, MARGIN.left, y, { width })
  doc.font('Helvetica').fontSize(11).fillColor(BRAND.accent)
    .text('The law behind it', { width })
  doc.moveDown(0.5)

  doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted).text(
    `Prepared for ${org?.home_name || 'your service'}${org?.address ? `, ${org.address}` : ''}`
    + `  ·  ${today}${opts.version ? `  ·  policy version ${opts.version}` : ''}`,
    { width })
  doc.moveDown(0.9)

  doc.moveTo(MARGIN.left, doc.y).lineTo(doc.page.width - MARGIN.right, doc.y)
    .lineWidth(2).strokeColor(BRAND.accent).stroke()
  doc.moveDown(0.9)

  // Who wrote what. The policy is theirs and carries their name, but it was written by us
  // from what they told us, and a document about provenance should be clear about its own.
  const boxTop = doc.y
  doc.font('Times-Roman').fontSize(10.5).fillColor(BRAND.ink).text(
    `This policy was generated and written by CareStream for ${org?.home_name || 'your service'}, `
    + 'using the information you provided about your service and the legislation set out below. '
    + 'Every required element was checked before it was released to you, and a person read it '
    + 'before it carried your name.',
    MARGIN.left + 14, boxTop + 12, { width: width - 28 })
  const boxBottom = doc.y + 12
  doc.save()
  doc.roundedRect(MARGIN.left, boxTop, width, boxBottom - boxTop, 8)
    .fillOpacity(1).fillAndStroke(BRAND.accentSoft, BRAND.rule)
  doc.restore()
  // Drawn again over the plate: pdfkit paints the rectangle on top of what was there.
  doc.fillColor(BRAND.ink).font('Times-Roman').fontSize(10.5).text(
    `This policy was generated and written by CareStream for ${org?.home_name || 'your service'}, `
    + 'using the information you provided about your service and the legislation set out below. '
    + 'Every required element was checked before it was released to you, and a person read it '
    + 'before it carried your name.',
    MARGIN.left + 14, boxTop + 12, { width: width - 28 })
  doc.y = boxBottom
  doc.moveDown(0.9)

  doc.font('Times-Roman').fontSize(10).fillColor(BRAND.muted).text(
    'This is a record of how the policy was produced and checked. It is not a certificate, and '
    + 'it does not represent approval by the Care Quality Commission, which does not approve or '
    + 'certify policies from any provider.',
    MARGIN.left, doc.y, { width })
  doc.moveDown(1.2)

  // ── what it was written against ─────────────────────────────────────────────
  if (!p.regulations.length) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#C0392B')
      .text('No regulations are recorded against this policy.', { width })
    doc.end()
    return done
  }

  const statutory = p.regulations.filter(r => r.authority_basis === 'statutory').length
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.ink)
    .text(`Written against ${p.regulations.length} instrument${p.regulations.length === 1 ? '' : 's'}`, { width })
  doc.font('Times-Roman').fontSize(10).fillColor(BRAND.muted).text(
    `${statutory} statutory, ${p.regulations.length - statutory} recognised guidance. `
    + `${p.element_totals.met} required element${p.element_totals.met === 1 ? '' : 's'} addressed.`,
    { width })
  doc.moveDown(0.6)

  p.regulations.forEach((r, i) => {
    room(120)
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(BRAND.ink)
      .text(`${i + 1}. ${r.official_name}`, MARGIN.left, doc.y, { width })
    doc.font('Helvetica').fontSize(8).fillColor(BRAND.accent)
      .text(r.authority_basis === 'statutory' ? 'STATUTORY' : 'RECOGNISED GUIDANCE', { width })
    doc.moveDown(0.25)

    if (r.summary) {
      doc.font('Times-Bold').fontSize(10).fillColor(BRAND.ink).text('What it requires: ', { continued: true })
      doc.font('Times-Roman').text(brief(r.summary), { width, lineGap: 2 })
      doc.moveDown(0.55)
    }
    if (r.care_home_context) {
      doc.font('Times-Bold').fontSize(10).fillColor(BRAND.ink).text('Why it matters in a care setting: ', { continued: true })
      doc.font('Times-Roman').text(brief(r.care_home_context), { width, lineGap: 2 })
      doc.moveDown(0.55)
    }

    // Only what the policy was found to address. See the note at the top of this file.
    const met = r.required_elements.filter(e => e.met === true)
    if (met.length) {
      room(40)
      doc.font('Times-Bold').fontSize(10).fillColor(BRAND.ink)
        .text(`Your policy addresses ${met.length} required element${met.length === 1 ? '' : 's'} of this:`, { width })
      doc.moveDown(0.15)
      doc.font('Times-Roman').fontSize(9.5).fillColor(BRAND.ink)
      for (const e of met) {
        const twoLines = doc.currentLineHeight(true) * 2
        if (doc.y + twoLines > doc.page.height - MARGIN.bottom) doc.addPage()
        const top = doc.y
        doc.text('•', MARGIN.left + 6, top, { width: 12 })
        doc.y = top
        doc.x = MARGIN.left + 20
        doc.text(e.text, { width: width - 20, lineGap: 1.5 })
        doc.x = MARGIN.left
        doc.moveDown(0.35)
      }
      doc.moveDown(0.4)
    }

    if (r.source_urls?.length) {
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.accent)
        .text(`Source: ${r.source_urls[0]}`, MARGIN.left, doc.y, { width, link: r.source_urls[0], underline: false })
      doc.fillColor(BRAND.ink)
    }
    doc.moveDown(1.1)
  })

  // ── CQC quality statements ──────────────────────────────────────────────────
  if (p.quality_statements.length) {
    room(120)
    doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.ink)
      .text('CQC quality statements this policy supports', MARGIN.left, doc.y, { width })
    doc.font('Times-Roman').fontSize(10).fillColor(BRAND.muted).text(
      'These follow from the regulations above. They are the statements an inspector would '
      + 'consider this policy under, not an assessment of your service.', { width })
    doc.moveDown(0.4)

    const grouped = new Map<string, typeof p.quality_statements>()
    for (const q of p.quality_statements) {
      const k = KEY_QUESTION[q.key_question] ?? q.key_question
      grouped.set(k, [...(grouped.get(k) ?? []), q])
    }
    for (const [question, list] of grouped) {
      room(60)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.accent).text(question, MARGIN.left, doc.y, { width })
      doc.moveDown(0.1)
      for (const q of list) {
        room(30)
        doc.font('Times-Bold').fontSize(9.5).fillColor(BRAND.ink)
          .text(`${q.number}. ${q.name}`, MARGIN.left + 10, doc.y, { width: width - 10, continued: Boolean(q.we_statement) })
        if (q.we_statement) {
          doc.font('Times-Italic').fillColor(BRAND.muted).text(` "${q.we_statement}"`, { width: width - 10 })
        }
      }
      doc.moveDown(0.3)
    }
  }

  // ── how it was checked ──────────────────────────────────────────────────────
  room(130)
  doc.moveDown(0.4)
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.ink)
    .text('How this policy was checked', MARGIN.left, doc.y, { width })
  doc.moveDown(0.2)
  doc.font('Times-Roman').fontSize(10).fillColor(BRAND.ink)
  const checks = [
    'Written from the required elements of the legislation above, one section per element.',
    'Checked that every required element is addressed, not merely mentioned.',
    'Checked for placeholders, and for organisations or instruments that no longer exist.',
    'Checked that it names your service, and that it claims nothing you have not told us.',
    'Read by a person before it was released to you.',
  ]
  for (const c of checks) {
    room(26)
    const top = doc.y
    doc.text('•', MARGIN.left + 6, top, { width: 12 })
    doc.y = top
    doc.x = MARGIN.left + 20
    doc.text(c, { width: width - 20, lineGap: 1.5 })
    doc.x = MARGIN.left
    doc.moveDown(0.35)
  }
  if (p.verified_at) {
    doc.moveDown(0.3)
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted)
      .text(`Last checked ${new Date(p.verified_at).toLocaleDateString('en-GB')}.`, { width })
  }

  // ── footer: our mark, our URL, our address, on every page ───────────────────
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    const restore = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const fy = doc.page.height - MARGIN.bottom + 20

    doc.moveTo(MARGIN.left, fy - 10).lineTo(doc.page.width - MARGIN.right, fy - 10)
      .lineWidth(0.75).strokeColor(BRAND.rule).stroke()

    let textLeft = MARGIN.left
    if (logo) {
      try {
        doc.image(logo.footer, MARGIN.left, fy - 2, { fit: [76, 22] })
        textLeft = MARGIN.left + 88
      } catch { /* fall back to text only */ }
    }

    doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.accent)
      .text(CARESTREAM.url, textLeft, fy, { width: 160, lineBreak: false })
    doc.font('Helvetica').fontSize(6.8).fillColor(BRAND.muted)
      .text(CARESTREAM.address, textLeft, fy + 10, { width: width - 190, lineBreak: false })

    doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.muted)
      .text(`${i + 1} / ${range.count}`, doc.page.width - MARGIN.right - 60, fy,
            { width: 60, align: 'right', lineBreak: false })
    doc.font('Helvetica').fontSize(6.8).fillColor(BRAND.muted)
      .text('Not a CQC certificate', doc.page.width - MARGIN.right - 160, fy + 10,
            { width: 160, align: 'right', lineBreak: false })

    doc.page.margins.bottom = restore
  }

  doc.end()
  return done
}
