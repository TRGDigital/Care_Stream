// The Word (.docx) version of the same formal document the PDF shows: a header with the logo and the organisation's name and address, the letter or report, the signature picture
// inline, and a footer with the legal details and page numbers. Built from the same LayoutDoc as the PDF, so the two match. The 'docx' package (pure JavaScript) is loaded when this runs.

import { footerFor, printable, type LayoutDoc } from './layout'

const FONT = 'Arial'
const PT = (n: number) => Math.round(n * 2)   // points to half points

/** Pixel size to draw an image at, keeping its shape inside a box (Word reads pixels at 96 per inch). */
function fit(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  const k = Math.min(maxW / w, maxH / h, 1)
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

export async function renderLayoutDocx(d: LayoutDoc): Promise<Buffer> {
  const [docx, { logoForPdf }, sharp] = await Promise.all([import('docx'), import('../policy/policy-pdf'), import('sharp').then(m => (m as any).default ?? m)])
  const { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, PageNumber, Table, TableRow, TableCell, WidthType, BorderStyle } = docx
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: none, bottom: none, left: none, right: none }

  const logoPng = await logoForPdf(d.head.logoDataUrl ?? null)
  let logoRun: any = null
  if (logoPng) {
    try {
      const meta = await sharp(logoPng).metadata()
      const size = fit(meta.width ?? 200, meta.height ?? 64, 200, 66)
      logoRun = new ImageRun({ type: 'png', data: logoPng, transformation: size })
    } catch { logoRun = null }
  }
  const orgLines: string[] = [...(d.head.addressLines ?? []), ...(d.head.contactLines ?? [])].map(printable)
  const centre = d.head.logoAlign === 'centre'

  const nameRuns = (align: any) => [
    new Paragraph({ alignment: align, spacing: { after: 20 }, children: [new TextRun({ text: printable(d.head.name), bold: true, font: FONT, size: PT(12), color: '1A1530' })] }),
    ...orgLines.map(l => new Paragraph({ alignment: align, spacing: { after: 0 }, children: [new TextRun({ text: l, font: FONT, size: PT(8.8), color: '5E4D70' })] })),
  ]
  const rule = new Paragraph({ spacing: { before: 80, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D9D4E0', space: 4 } }, children: [] })
  const headerChildren: any[] = centre
    ? [
        ...(logoRun ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [logoRun] })] : []),
        ...nameRuns(AlignmentType.CENTER), rule,
      ]
    : [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
          rows: [new TableRow({ children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({ children: logoRun ? [logoRun] : [] })] }),
            new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: noBorders, children: nameRuns(AlignmentType.RIGHT) }),
          ] })],
        }),
        rule,
      ]

  const foot = footerFor(d.head)
  const footerChildren: any[] = [
    ...foot.map((l, i) => new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 0 }, border: i === 0 ? { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9D4E0', space: 4 } } : undefined,
      children: [new TextRun({ text: l, font: FONT, size: PT(7.5), color: '777777' })],
    })),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 40 }, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: FONT, size: PT(7.5), color: '777777' })] }),
  ]

  const para = (text: string, o: { bold?: boolean; color?: string; size?: number; after?: number; before?: number; bullet?: boolean } = {}) => new Paragraph({
    spacing: { after: o.after ?? 140, before: o.before ?? 0, line: 300 }, bullet: o.bullet ? { level: 0 } : undefined,
    children: [new TextRun({ text: printable(text), font: FONT, size: PT(o.size ?? 10.5), bold: o.bold, color: o.color ?? '1A1530' })],
  })
  const bodyParas = d.blocks.map(b => b.t === 'li' ? para(b.text, { bullet: true, after: 60 }) : b.t === 'h' ? para(b.text, { bold: true, size: d.kind === 'letter' ? 11 : 13, color: d.kind === 'letter' ? '1A1530' : '0F766E', before: 120, after: 80 }) : para(b.text))

  const children: any[] = []
  if (d.kind === 'letter') {
    children.push(para(d.date ?? '', { color: '5E4D70', size: 10, after: 200 }))
    if (d.confidential) children.push(para('PRIVATE AND CONFIDENTIAL', { bold: true, color: '5E4D70', size: 8.5, after: 60 }))
    children.push(para(d.recipient?.name ?? '', { bold: true, after: 0 }))
    if (d.recipient?.role) children.push(para(d.recipient.role, { color: '5E4D70', size: 10, after: 0 }))
    for (const l of d.recipient?.addressLines ?? []) children.push(para(l, { color: '5E4D70', size: 10, after: 0 }))
    children.push(para(d.subject ?? '', { bold: true, size: 11.5, before: 240, after: 200 }))
    children.push(...bodyParas)
    children.push(para(d.closing ?? '', { before: 120, after: 80 }))
    const sig = d.signer?.signature ?? null
    if (sig) {
      const size = fit(sig.width, sig.height, 227, 68)   // about 18 mm high at most
      children.push(new Paragraph({ spacing: { after: 40 }, children: [new ImageRun({ type: 'png', data: sig.png, transformation: size })] }))
    } else children.push(new Paragraph({ spacing: { after: 480 }, children: [] }))
    children.push(para(d.signer?.name ?? '', { bold: true, after: 0 }))
    if (d.signer?.role) children.push(para(d.signer.role, { color: '5E4D70', size: 10, after: 0 }))
    if (d.acknowledgement) {
      const box = { style: BorderStyle.SINGLE, size: 4, color: 'D9D4E0' }
      children.push(new Paragraph({ spacing: { after: 160 }, children: [] }))
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [new TableCell({ borders: { top: box, bottom: box, left: box, right: box }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [
          para(d.acknowledgement, { size: 10 }), para('Signed: ____________________________        Date: ________________', { size: 10, color: '5E4D70', before: 200, after: 0 }),
        ] })] })],
      }))
    }
  } else {
    children.push(para(d.subject ?? '', { bold: true, size: 20, after: 60 }))
    if (d.date) children.push(para(d.date, { color: '5E4D70', size: 10, after: 40 }))
    if (d.subtitle) children.push(para(d.subtitle, { color: '5E4D70', size: 10, after: 40 }))
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
    children.push(...bodyParas)
    if (d.signer?.name) {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
      const sig = d.signer.signature
      if (sig) children.push(new Paragraph({ spacing: { after: 40 }, children: [new ImageRun({ type: 'png', data: sig.png, transformation: fit(sig.width, sig.height, 227, 68) })] }))
      children.push(para(d.signer.name, { bold: true, after: 0 }))
      if (d.signer.role) children.push(para(d.signer.role, { color: '5E4D70', size: 10, after: 0 }))
    }
  }

  const document = new Document({
    creator: printable(d.head.name), title: printable(d.subject ?? d.head.name),
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1700, bottom: 1300, left: 1134, right: 1134, header: 560, footer: 500 } } },
      headers: { default: new Header({ children: headerChildren }) },
      footers: { default: new Footer({ children: footerChildren }) },
      children,
    }],
  })
  return Buffer.from(await Packer.toBuffer(document))
}
