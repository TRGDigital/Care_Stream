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
import 'pdfkit/standard-fonts/TimesRoman'
import 'pdfkit/standard-fonts/TimesBold'
import 'pdfkit/standard-fonts/TimesItalic'
import 'pdfkit/standard-fonts/Helvetica'
import 'pdfkit/standard-fonts/HelveticaBold'
import 'pdfkit/standard-fonts/HelveticaOblique'
import type { PolicyProvenance } from '../policy-writer/policy-provenance'

const MARGIN = { top: 56, bottom: 64, left: 56, right: 56 }

const KEY_QUESTION: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring',
  responsive: 'Responsive', 'well-led': 'Well-led', wellled: 'Well-led',
}

export interface LegislationPdfOrg {
  home_name?: string | null
  address?: string | null
  logo?: Buffer | null
}

export function buildLegislationPdf(opts: {
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

  // ── letterhead ──────────────────────────────────────────────────────────────
  let y = MARGIN.top
  if (org?.logo) {
    try { doc.image(org.logo, MARGIN.left, y, { fit: [140, 44] }); y += 52 }
    catch (e: any) { console.warn(`[legislation-pdf] logo could not be drawn (${e?.message})`) }
  }
  if (org?.home_name) {
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a1a1a').text(org.home_name, MARGIN.left, y, { width })
    y = doc.y + 2
  }
  if (org?.address) {
    doc.font('Helvetica').fontSize(8.5).fillColor('#555555').text(org.address, MARGIN.left, y, { width })
    y = doc.y + 6
  }
  doc.moveTo(MARGIN.left, y).lineTo(doc.page.width - MARGIN.right, y).lineWidth(1.5).strokeColor('#0d9488').stroke()
  y += 18

  doc.font('Helvetica-Bold').fontSize(19).fillColor('#1a1a1a')
    .text(`${p.policy_title}: the law behind it`, MARGIN.left, y, { width })
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
    .text(`Prepared ${today}${opts.version ? `  ·  policy version ${opts.version}` : ''}`, { width })
  doc.moveDown(0.8)

  doc.font('Times-Roman').fontSize(10.5).fillColor('#1a1a1a').text(
    'This document sets out the legislation, regulations and national guidance your policy was '
    + 'written against, what each one requires, and the CQC quality statements it supports. It is '
    + 'a record of how the policy was produced and checked. It is not a certificate, and it does '
    + 'not represent approval by the Care Quality Commission, which does not approve or certify '
    + 'policies from any provider.',
    { width, align: 'left' })
  doc.moveDown(0.8)

  // ── what it was written against ─────────────────────────────────────────────
  if (!p.regulations.length) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#b91c1c')
      .text('No regulations are recorded against this policy.', { width })
    doc.end()
    return done
  }

  const statutory = p.regulations.filter(r => r.authority_basis === 'statutory').length
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
    .text(`Written against ${p.regulations.length} instrument${p.regulations.length === 1 ? '' : 's'}`, { width })
  doc.font('Times-Roman').fontSize(10).fillColor('#555555').text(
    `${statutory} statutory, ${p.regulations.length - statutory} recognised guidance. `
    + `${p.element_totals.met} required element${p.element_totals.met === 1 ? '' : 's'} addressed.`,
    { width })
  doc.moveDown(0.6)

  p.regulations.forEach((r, i) => {
    room(120)
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0f172a')
      .text(`${i + 1}. ${r.official_name}`, MARGIN.left, doc.y, { width })
    doc.font('Helvetica').fontSize(8).fillColor('#0d9488')
      .text(r.authority_basis === 'statutory' ? 'STATUTORY' : 'RECOGNISED GUIDANCE', { width })
    doc.moveDown(0.25)

    if (r.summary) {
      doc.font('Times-Bold').fontSize(10).fillColor('#1a1a1a').text('What it requires: ', { continued: true })
      doc.font('Times-Roman').text(r.summary, { width })
      doc.moveDown(0.2)
    }
    if (r.care_home_context) {
      doc.font('Times-Bold').fontSize(10).fillColor('#1a1a1a').text('Why it matters in a care setting: ', { continued: true })
      doc.font('Times-Roman').text(r.care_home_context, { width })
      doc.moveDown(0.2)
    }

    // Only what the policy was found to address. See the note at the top of this file.
    const met = r.required_elements.filter(e => e.met === true)
    if (met.length) {
      room(40)
      doc.font('Times-Bold').fontSize(10).fillColor('#1a1a1a')
        .text(`Your policy addresses ${met.length} required element${met.length === 1 ? '' : 's'} of this:`, { width })
      doc.moveDown(0.15)
      doc.font('Times-Roman').fontSize(9.5).fillColor('#1a1a1a')
      for (const e of met) {
        const twoLines = doc.currentLineHeight(true) * 2
        if (doc.y + twoLines > doc.page.height - MARGIN.bottom) doc.addPage()
        const top = doc.y
        doc.text('•', MARGIN.left + 6, top, { width: 12 })
        doc.y = top
        doc.x = MARGIN.left + 20
        doc.text(e.text, { width: width - 20 })
        doc.x = MARGIN.left
      }
      doc.moveDown(0.2)
    }

    if (r.source_urls?.length) {
      doc.font('Helvetica').fontSize(8).fillColor('#0d9488')
        .text(`Source: ${r.source_urls[0]}`, MARGIN.left, doc.y, { width, link: r.source_urls[0], underline: false })
      doc.fillColor('#1a1a1a')
    }
    doc.moveDown(0.7)
  })

  // ── CQC quality statements ──────────────────────────────────────────────────
  if (p.quality_statements.length) {
    room(120)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
      .text('CQC quality statements this policy supports', MARGIN.left, doc.y, { width })
    doc.font('Times-Roman').fontSize(10).fillColor('#555555').text(
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
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0d9488').text(question, MARGIN.left, doc.y, { width })
      doc.moveDown(0.1)
      for (const q of list) {
        room(30)
        doc.font('Times-Bold').fontSize(9.5).fillColor('#1a1a1a')
          .text(`${q.number}. ${q.name}`, MARGIN.left + 10, doc.y, { width: width - 10, continued: Boolean(q.we_statement) })
        if (q.we_statement) {
          doc.font('Times-Italic').fillColor('#555555').text(` "${q.we_statement}"`, { width: width - 10 })
        }
      }
      doc.moveDown(0.3)
    }
  }

  // ── how it was checked ──────────────────────────────────────────────────────
  room(130)
  doc.moveDown(0.4)
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
    .text('How this policy was checked', MARGIN.left, doc.y, { width })
  doc.moveDown(0.2)
  doc.font('Times-Roman').fontSize(10).fillColor('#1a1a1a')
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
    doc.text(c, { width: width - 20 })
    doc.x = MARGIN.left
  }
  if (p.verified_at) {
    doc.moveDown(0.3)
    doc.font('Helvetica').fontSize(9).fillColor('#555555')
      .text(`Last checked ${new Date(p.verified_at).toLocaleDateString('en-GB')}.`, { width })
  }

  // ── footer on every page ────────────────────────────────────────────────────
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    const restore = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const fy = doc.page.height - MARGIN.bottom + 18
    doc.moveTo(MARGIN.left, fy - 8).lineTo(doc.page.width - MARGIN.right, fy - 8)
      .lineWidth(0.5).strokeColor('#eeeeee').stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor('#999999')
    doc.text(`${org?.home_name || ''}  -  ${p.policy_title}: the law behind it  -  not a CQC certificate`,
      MARGIN.left, fy, { width: width - 60, lineBreak: false })
    doc.text(`${i + 1} / ${range.count}`, doc.page.width - MARGIN.right - 60, fy,
      { width: 60, align: 'right', lineBreak: false })
    doc.page.margins.bottom = restore
  }

  doc.end()
  return done
}
