// A real, text-based PDF of a policy.
//
// Until now "Download PDF" opened the browser print dialog and the user chose Save as
// PDF. For an uploaded policy the fix is to hand back the original file. For a
// CareStream-written policy there is no original -- it is markdown we generated -- so
// the PDF has to be produced, and for the policy shop that document IS the product.
//
// Built from the SAME cached HTML the preview and print view render, not re-parsed
// from the source text. Two renderings of one document will diverge eventually; one
// rendering cannot.
//
// pdfkit rather than headless Chromium: the output is real text, so it is selectable,
// searchable and small, and there is no browser binary in a serverless bundle. The
// HTML it has to understand is a closed set, because formatPolicyHtml produces it:
// h2, h3, p, ul/ol/li, strong, em, br.

import PDFDocument from 'pdfkit'
import sharp from 'sharp'

// These six imports are never referenced, and must not be removed.
//
// pdfkit loads the metrics for a standard font with require('#standard-fonts/TimesRoman')
// -- a package-imports subpath, resolved through the "imports" map in its package.json.
// Vercel traces the serverless bundle by reading the source statically, and it does not
// follow "#" specifiers, so those .cjs files were left out of the deployment. Locally the
// whole of node_modules is on disk and everything passed; deployed, the first doc.text()
// threw Cannot find module and /policies/:id/pdf returned 500 -- which is why Download
// kept falling back to the print view.
//
// Importing the same files through their PUBLIC subpath (pdfkit/standard-fonts/X, also in
// that package.json) is an ordinary static import the tracer does follow, so they get
// bundled. Only the faces this document actually uses are listed.
import 'pdfkit/standard-fonts/TimesRoman'
import 'pdfkit/standard-fonts/TimesBold'
import 'pdfkit/standard-fonts/TimesItalic'
import 'pdfkit/standard-fonts/TimesBoldItalic'
import 'pdfkit/standard-fonts/Helvetica'
import 'pdfkit/standard-fonts/HelveticaBold'

/** The letterhead logo, decoded and in a format pdfkit can actually draw.
 *
 *  pdfkit renders PNG and JPEG only. The settings upload stores whatever the user chose as a
 *  data URL, and in practice that is WebP -- every tenant we have stores WebP. doc.image()
 *  throws on it, the draw was wrapped in a silent catch, and the letterhead came out bare
 *  with nothing to say why. So convert first, and say so when it cannot be done.
 *
 *  Returns null rather than throwing: a logo we cannot decode must not cost them the policy. */
export async function logoForPdf(dataUrl: string | null | undefined): Promise<Buffer | null> {
  const m = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(String(dataUrl ?? ''))
  if (!m) return null
  const [, format, b64] = m
  let raw: Buffer
  try {
    raw = Buffer.from(b64, 'base64')
  } catch {
    console.warn('[policy-pdf] Logo is not valid base64; letterhead will have no logo')
    return null
  }
  // Drawn into a 140x44 box, so anything wider than 2x that is weight for nothing: the
  // uploaded logo is often a full-resolution export, and embedding it whole was adding
  // ~200KB to every policy PDF.
  const supported = /^(png|jpe?g)$/i.test(format)
  try {
    return await sharp(raw)
      .resize({ width: LOGO_MAX_WIDTH, withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch (e: any) {
    // A format sharp could not read. If pdfkit can draw the original anyway, use it
    // rather than dropping a logo that would have worked.
    if (supported) {
      console.warn(`[policy-pdf] Could not resize the logo (${e?.message}); using it at full size`)
      return raw
    }
    console.warn(`[policy-pdf] Could not convert a ${format} logo to PNG (${e?.message}); letterhead will have no logo`)
    return null
  }
}

const LOGO_MAX_WIDTH = 280   // 2x the 140pt draw box, so it stays crisp in print

export interface PolicyPdfOrg {
  home_name?: string | null
  address?: string | null
  registered_manager?: string | null
  default_approver?: string | null
  review_cycle_months?: string | number | null
  logo?: Buffer | null
}

type Node =
  | { kind: 'h2' | 'h3' | 'p'; runs: Run[] }
  | { kind: 'li'; runs: Run[]; ordered: boolean; index: number }

interface Run { text: string; bold?: boolean; italic?: boolean }

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '-', ndash: '-', hellip: '...', middot: '.', pound: '£',
  ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'",
}

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X'
        ? parseInt(ref.slice(2), 16)
        : parseInt(ref.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[ref.toLowerCase()] ?? m
  })
}

/** Split a block's inner HTML into styled runs. Only strong/b and em/i carry style. */
function runsOf(inner: string): Run[] {
  const runs: Run[] = []
  let bold = 0
  let italic = 0
  const re = /<\/?([a-z0-9]+)[^>]*>/gi
  let last = 0
  let m: RegExpExecArray | null
  const push = (raw: string) => {
    const text = decode(raw).replace(/\s+/g, ' ')
    if (text) runs.push({ text, bold: bold > 0, italic: italic > 0 })
  }
  while ((m = re.exec(inner))) {
    push(inner.slice(last, m.index))
    const tag = m[1].toLowerCase()
    const closing = m[0][1] === '/'
    if (tag === 'strong' || tag === 'b') bold += closing ? -1 : 1
    else if (tag === 'em' || tag === 'i') italic += closing ? -1 : 1
    last = m.index + m[0].length
  }
  push(inner.slice(last))
  return runs
}

/** The closed tag set formatPolicyHtml emits, flattened into blocks in document order. */
export function parsePolicyHtml(html: string): Node[] {
  const out: Node[] = []
  const pattern = /<(h2|h3|p)[^>]*>([\s\S]*?)<\/\1>|<(ul|ol)[^>]*>([\s\S]*?)<\/\3>/gi
  let m: RegExpExecArray | null
  while ((m = pattern.exec(html))) {
    if (m[1]) {
      const kind = m[1].toLowerCase() as 'h2' | 'h3' | 'p'
      const runs = runsOf(m[2])
      if (runs.some(r => r.text.trim())) out.push({ kind, runs })
    } else {
      const ordered = m[3].toLowerCase() === 'ol'
      let i = 0
      for (const li of m[4].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        const runs = runsOf(li[1])
        if (!runs.some(r => r.text.trim())) continue
        i += 1
        out.push({ kind: 'li', runs, ordered, index: i })
      }
    }
  }
  return out
}

const MARGIN = { top: 56, bottom: 64, left: 56, right: 56 }

export function buildPolicyPdf(opts: {
  policyName: string
  version: string
  html: string
  org: PolicyPdfOrg | null
}): Promise<Buffer> {
  const { policyName, version, html, org } = opts
  const doc = new PDFDocument({ size: 'A4', margins: MARGIN, bufferPages: true, autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', c => chunks.push(c as Buffer))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const width = doc.page.width - MARGIN.left - MARGIN.right
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const months = Number(org?.review_cycle_months || 12) || 12
  const next = new Date()
  next.setMonth(next.getMonth() + months)
  const nextReview = next.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  // -- letterhead ------------------------------------------------------------
  let y = MARGIN.top
  if (org?.logo) {
    try {
      doc.image(org.logo, MARGIN.left, y, { fit: [140, 44] })
      y += 52
    } catch (e: any) {
      // A logo we cannot draw must not cost them the document, but it must not vanish
      // silently either -- that is what hid the WebP problem. logoForPdf should have
      // converted it already, so reaching here means something new.
      console.warn(`[policy-pdf] Logo could not be drawn (${e?.message}); continuing without it`)
    }
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

  doc.font('Helvetica-Bold').fontSize(19).fillColor('#1a1a1a').text(policyName, MARGIN.left, y, { width })
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
    .text(`Version ${version || '1.0'}  -  Approved copy  -  Printed ${today}`, { width })
  doc.moveDown(1)

  // -- body ------------------------------------------------------------------
  const fontFor = (r: Run) => (r.bold && r.italic
    ? 'Times-BoldItalic'
    : r.bold ? 'Times-Bold' : r.italic ? 'Times-Italic' : 'Times-Roman')

  const writeRuns = (runs: Run[], size: number) => {
    doc.fontSize(size).fillColor('#1a1a1a')
    if (!runs.length) { doc.text(' '); return }
    // The measure is fixed BEFORE writing. With continued:true pdfkit leaves doc.x at
    // the end of the run it just wrote, so deriving the width from doc.x inside the
    // loop shrank it on every bold word until the text was wrapping in a few
    // characters -- which is what turned one page of policy into three.
    const measure = width - (doc.x - MARGIN.left)
    runs.forEach((r, i) => {
      const last = i === runs.length - 1
      doc.font(fontFor(r)).text(r.text, { width: measure, continued: !last })
    })
  }

  for (const node of parsePolicyHtml(html)) {
    // Keep a heading with what follows it: a heading stranded at the foot of a page is
    // the one break that makes a policy look broken.
    const needed = node.kind === 'h2' ? 70 : node.kind === 'h3' ? 56 : 28
    if (doc.y + needed > doc.page.height - MARGIN.bottom) doc.addPage()

    if (node.kind === 'h2') {
      doc.moveDown(0.7)
      doc.font('Helvetica-Bold').fontSize(13.5).fillColor('#0f172a')
        .text(node.runs.map(r => r.text).join(''), MARGIN.left, doc.y, { width })
      doc.moveDown(0.25)
    } else if (node.kind === 'h3') {
      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0f172a')
        .text(node.runs.map(r => r.text).join(''), MARGIN.left, doc.y, { width })
      doc.moveDown(0.15)
    } else if (node.kind === 'li') {
      const bullet = node.ordered ? `${node.index}.` : '•'
      // The bullet is drawn at a fixed y and the text then flows. If the text needs a
      // new page the bullet would be left behind on the previous one, so make sure at
      // least two lines fit before starting. A genuinely long item still spans pages,
      // which is correct -- it just never starts one line from the bottom.
      doc.font('Times-Roman').fontSize(10.5)
      const twoLines = doc.currentLineHeight(true) * 2
      if (doc.y + twoLines > doc.page.height - MARGIN.bottom) doc.addPage()
      const top = doc.y
      doc.font('Times-Roman').fontSize(10.5).fillColor('#1a1a1a')
        .text(bullet, MARGIN.left, top, { width: 18 })
      doc.y = top
      doc.x = MARGIN.left + 18
      writeRuns(node.runs, 10.5)
      doc.x = MARGIN.left
      doc.moveDown(0.2)
    } else {
      doc.x = MARGIN.left
      writeRuns(node.runs, 10.5)
      doc.moveDown(0.35)
    }
  }

  // -- sign-off --------------------------------------------------------------
  if (doc.y + 140 > doc.page.height - MARGIN.bottom) doc.addPage()
  doc.moveDown(1.2)
  if (doc.y + 30 > doc.page.height - MARGIN.bottom) doc.addPage()
  const sy = doc.y
  doc.moveTo(MARGIN.left, sy).lineTo(doc.page.width - MARGIN.right, sy).lineWidth(0.75).strokeColor('#cccccc').stroke()
  doc.moveDown(0.8)

  const rows: Array<[string, string]> = [
    ['Registered manager:', org?.registered_manager || ''],
    ['Approved by:', org?.default_approver || org?.registered_manager || ''],
    ['Date approved:', today],
    ['Next review:', nextReview],
    ['Signature:', ''],
  ]
  for (const [label, value] of rows) {
    // Explicit coordinates do not paginate themselves: without this a row at the foot
    // of a page is drawn over the footer, or off the page entirely. This is what cuts
    // a name in half.
    if (doc.y + 26 > doc.page.height - MARGIN.bottom) doc.addPage()
    const ry = doc.y
    doc.font('Helvetica').fontSize(9.5).fillColor('#555555').text(label, MARGIN.left, ry, { width: 120 })
    if (value) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1a1a1a')
        .text(value, MARGIN.left + 128, ry, { width: width - 128 })
    } else {
      // a rule to sign on, rather than an empty gap
      const ly = ry + 10
      doc.moveTo(MARGIN.left + 128, ly).lineTo(MARGIN.left + 328, ly).lineWidth(0.75).strokeColor('#999999').stroke()
      doc.y = ry + 16
    }
    doc.moveDown(0.25)
  }

  // -- footer on every page, added last so the page count is known ------------
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    // The footer sits INSIDE the bottom margin, and pdfkit answers text below the
    // margin by starting a new page -- which then needs its own footer, and so on.
    // One page of policy was coming out as three. Dropping the margin for the write
    // and restoring it is the documented way round it.
    const restoreBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const fy = doc.page.height - MARGIN.bottom + 18
    doc.moveTo(MARGIN.left, fy - 8).lineTo(doc.page.width - MARGIN.right, fy - 8)
      .lineWidth(0.5).strokeColor('#eeeeee').stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor('#999999')
    doc.text(
      `${org?.home_name || ''}  -  ${policyName}  -  v${version || '1.0'}  -  Uncontrolled when printed`,
      MARGIN.left, fy, { width: width - 60, lineBreak: false },
    )
    doc.text(`${i + 1} / ${range.count}`, doc.page.width - MARGIN.right - 60, fy,
      { width: 60, align: 'right', lineBreak: false })
    doc.page.margins.bottom = restoreBottom
  }

  doc.end()
  return done
}
