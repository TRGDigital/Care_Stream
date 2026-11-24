// The merge engine and the renderers for letter templates: placeholders are filled and formatted (UK dates and money), blocks are shown or hidden by their conditions,
// and the result comes out as plain text, HTML (every value escaped) and a PDF on the service's letterhead. Nothing here reads the database.

import { TEMPLATES, DRAFT_NOTE, type FieldDef, type LetterTemplate, type Block } from './templates'
import { fmtDate, fmtMoney, fmtNumber, parseDate, parseNumber } from './format'

export type Values = Record<string, unknown>

export interface RenderedBlock { t: 'p' | 'li' | 'h'; text: string }
export interface RenderedLetter {
  id: string
  title: string
  subject: string
  date: string
  recipient: { name: string; role: string }
  blocks: RenderedBlock[]
  closing: string
  signOff: { name: string; role: string }
  acknowledgement: string | null
  /** The letter as plain text, ready to paste or to email. */
  text: string
  /** The letter as HTML, every value escaped. */
  html: string
  /** Labels of required fields that have no value. They show as [Label] in the draft so the gap is easy to see. */
  missing: string[]
  /** Fields whose value could not be read (a date that is not a date, a number that is not a number, a choice that is not offered). */
  invalid: Array<{ key: string; label: string; message: string }>
  /** True only when nothing is missing and nothing is invalid: the letter can go for approval. */
  ok: boolean
  beforeYouSend: string[]
  references: Array<{ label: string; url: string }>
  draftNote: string
}

export function getTemplate(id: string): LetterTemplate | undefined { return TEMPLATES.find(t => t.id === id) }

// ── Reading and checking values ──────────────────────────────────────────────────────────────────
interface Normalised {
  /** What conditions test: choices by their value, everything else by its shown text. '' when empty. */
  cond: Record<string, string>
  /** What placeholders print. */
  show: Record<string, string>
  /** Raw typed values for derive: numbers, ISO dates, strings, arrays. */
  raw: Record<string, any>
  lists: Record<string, string[]>
  invalid: Array<{ key: string; label: string; message: string }>
}

const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

function normalise(fields: FieldDef[], values: Values): Normalised {
  const n: Normalised = { cond: {}, show: {}, raw: {}, lists: {}, invalid: [] }
  for (const f of fields) {
    const v = values[f.key]
    if (blank(v)) { n.cond[f.key] = ''; n.show[f.key] = ''; continue }
    switch (f.type) {
      case 'text': case 'longtext': {
        const s = String(v).replace(/\r\n/g, '\n').trim()
        n.raw[f.key] = s; n.cond[f.key] = s; n.show[f.key] = s; break
      }
      case 'date': {
        const iso = parseDate(v)
        if (!iso) { n.invalid.push({ key: f.key, label: f.label, message: 'This is not a date. Use a day, month and year.' }); n.cond[f.key] = ''; n.show[f.key] = ''; break }
        n.raw[f.key] = iso; n.cond[f.key] = iso; n.show[f.key] = fmtDate(iso); break
      }
      case 'money': {
        const x = parseNumber(v)
        if (x == null || x < 0) { n.invalid.push({ key: f.key, label: f.label, message: 'This is not an amount of money.' }); n.cond[f.key] = ''; n.show[f.key] = ''; break }
        n.raw[f.key] = x; n.cond[f.key] = String(x); n.show[f.key] = fmtMoney(x); break
      }
      case 'number': {
        const x = parseNumber(v)
        if (x == null) { n.invalid.push({ key: f.key, label: f.label, message: 'This is not a number.' }); n.cond[f.key] = ''; n.show[f.key] = ''; break }
        n.raw[f.key] = x; n.cond[f.key] = String(x); n.show[f.key] = fmtNumber(x); break
      }
      case 'choice': {
        const c = f.choices?.find(o => o.value === String(v))
        if (!c) { n.invalid.push({ key: f.key, label: f.label, message: 'Please choose one of the options.' }); n.cond[f.key] = ''; n.show[f.key] = ''; break }
        n.raw[f.key] = c.value; n.cond[f.key] = c.value; n.show[f.key] = c.label; break
      }
      case 'list': {
        const lines = (Array.isArray(v) ? v.map(String) : String(v).split(/\r?\n/)).map(l => l.replace(/^[\s*•]+/, '').trim()).filter(Boolean)
        n.lists[f.key] = lines; n.raw[f.key] = lines; n.cond[f.key] = lines.length ? lines.join('|') : ''; n.show[f.key] = lines.join(', '); break
      }
    }
  }
  return n
}

/** One condition: "key", "!key", "key=value", "key!=value", joined with &&. */
export function holds(cond: string | undefined, ctx: Record<string, string>): boolean {
  if (!cond) return true
  return cond.split('&&').every(raw => {
    const c = raw.trim()
    if (!c) return true
    let m = /^([a-z0-9_]+)!=(.*)$/i.exec(c); if (m) return (ctx[m[1]] ?? '') !== m[2]
    m = /^([a-z0-9_]+)=(.*)$/i.exec(c); if (m) return (ctx[m[1]] ?? '') === m[2]
    if (c.startsWith('!')) return !(ctx[c.slice(1)] ?? '')
    return !!(ctx[c] ?? '')
  })
}

const firstNameOf = (full: string) => full.trim().split(/\s+/)[0] ?? ''

/** Which required fields are missing, and which values cannot be read. */
export function validateValues(t: LetterTemplate, values: Values): { ok: boolean; missing: string[]; invalid: Array<{ key: string; label: string; message: string }> } {
  const n = normalise(t.fields, values)
  const ctx = { ...n.cond }
  const missing = t.fields.filter(f => (f.required || (f.requiredWhen && holds(f.requiredWhen, ctx))) && !ctx[f.key]).map(f => f.label)
  return { ok: missing.length === 0 && n.invalid.length === 0, missing, invalid: n.invalid }
}

// ── Merging ──────────────────────────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** Replaces each {{key}} once, in a single pass, so a value that itself contains {{x}} is never expanded. */
function merge(text: string, show: Record<string, string>, requiredMissing: Map<string, string>): string {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, k: string) => {
    const v = show[k]
    if (v) return v
    const label = requiredMissing.get(k)
    return label ? `[${label}]` : ''
  }).replace(/[ \t]{2,}/g, ' ').replace(/ +([,.])/g, '$1').trim()
}

export function renderLetter(t: LetterTemplate, values: Values): RenderedLetter {
  const n = normalise(t.fields, values)
  const show: Record<string, string> = { ...n.show }
  const ctx: Record<string, string> = { ...n.cond }
  const first = firstNameOf(n.show.recipient_name ?? '')
  show.first_name = first || '[First name]'; ctx.first_name = first
  const derived = t.derive ? t.derive(n.raw) : {}
  for (const [k, v] of Object.entries(derived)) { show[k] = v; ctx[k] = v }

  const reqMissing = new Map<string, string>()
  for (const f of t.fields) if ((f.required || (f.requiredWhen && holds(f.requiredWhen, ctx))) && !ctx[f.key]) reqMissing.set(f.key, f.label)

  const blocks: RenderedBlock[] = []
  for (const b of t.body as Block[]) {
    if (!holds(b.when, ctx)) continue
    if (b.t === 'list') { for (const line of n.lists[b.field] ?? []) blocks.push({ t: 'li', text: line }); continue }
    const text = merge(b.text, show, reqMissing)
    if (text) blocks.push({ t: b.t, text })
  }

  const subject = merge(t.subject, show, reqMissing)
  const ackOn = t.acknowledgement && holds(t.acknowledgement.when, ctx)
  const acknowledgement = ackOn ? merge(t.acknowledgement!.text, show, reqMissing) : null
  const missing = [...reqMissing.values()]
  const recipient = { name: show.recipient_name || '', role: show.recipient_role || '' }
  const signOff = { name: show.manager_name || '', role: show.manager_role || '' }
  const date = show.letter_date || ''

  const text = [
    date, '', recipient.name + (recipient.role ? `, ${recipient.role}` : ''), '', `Subject: ${subject}`, '',
    ...blocks.map(b => (b.t === 'li' ? `  * ${b.text}` : b.text)), '', t.closing, '', signOff.name + (signOff.role ? `, ${signOff.role}` : ''),
    ...(acknowledgement ? ['', acknowledgement, '', 'Signed: ____________________    Date: ______________'] : []),
  ].join('\n').replace(/\n{3,}/g, '\n\n')

  // HTML: a list item run becomes one <ul>.
  const html: string[] = []
  let inList = false
  for (const b of blocks) {
    if (b.t === 'li') { if (!inList) { html.push('<ul>'); inList = true } html.push(`<li>${esc(b.text)}</li>`); continue }
    if (inList) { html.push('</ul>'); inList = false }
    html.push(b.t === 'h' ? `<h3>${esc(b.text)}</h3>` : `<p>${esc(b.text).replace(/\n/g, '<br>')}</p>`)
  }
  if (inList) html.push('</ul>')
  const htmlOut = [
    `<div class="letter">`,
    `<p>${esc(date)}</p>`,
    `<p><strong>${esc(recipient.name)}</strong>${recipient.role ? `<br>${esc(recipient.role)}` : ''}</p>`,
    `<p><strong>${esc(subject)}</strong></p>`,
    ...html,
    `<p>${esc(t.closing)}</p>`,
    `<p><strong>${esc(signOff.name)}</strong>${signOff.role ? `<br>${esc(signOff.role)}` : ''}</p>`,
    ...(acknowledgement ? [`<hr><p>${esc(acknowledgement)}</p><p>Signed: ____________________ &nbsp; Date: ______________</p>`] : []),
    `</div>`,
  ].join('\n')

  return {
    id: t.id, title: t.title, subject, date, recipient, blocks, closing: t.closing, signOff, acknowledgement, text, html: htmlOut,
    missing, invalid: n.invalid, ok: missing.length === 0 && n.invalid.length === 0,
    beforeYouSend: t.beforeYouSend, references: t.references, draftNote: DRAFT_NOTE,
  }
}

// ── The PDF ──────────────────────────────────────────────────────────────────────────────────────
export interface Letterhead { name: string; address?: string | null; logoDataUrl?: string | null }

/** pdfkit's standard fonts cover Latin text. Anything outside it (emoji and the like) would print as a gap, so it is dropped. Curly quotes, the pound sign and the euro sign are kept. */
function pdfSafe(s: string): string {
  return s.normalize('NFC').replace(/[‘’]/g, '’').replace(/[^\u0009\u000A -~ -ÿ’“”…•€]/g, '')
}

/** The letter as a PDF on the service's letterhead. pdfkit and the policy PDF helpers are loaded when this is called, so everything else in this module works without them. */
export async function renderLetterPdf(t: LetterTemplate, values: Values, head: Letterhead): Promise<Buffer> {
  const r = renderLetter(t, values)
  const [{ default: PDFDocument }, { logoForPdf }] = await Promise.all([import('pdfkit'), import('../policy/policy-pdf')])
  const logo = await logoForPdf(head.logoDataUrl ?? null)
  const M = 56, W = 595.28, H = 841.89
  const width = W - M * 2
  const INK = '#1A1530', MID = '#5E4D70', LINE = '#d9d4e0'
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: pdfSafe(r.subject), Author: pdfSafe(head.name) } })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const bottom = H - M - 20
  const ensure = (h: number) => { if (doc.y + h > bottom) doc.addPage() }

  // Letterhead: logo on the left, the service's name and address on the right, then a thin rule.
  const top = doc.y
  if (logo) { try { doc.image(logo, M, top, { fit: [150, 48] }) } catch { /* no logo */ } }
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(pdfSafe(head.name), M, top + 2, { width, align: 'right' })
  if (head.address) doc.fillColor(MID).font('Helvetica').fontSize(9).text(pdfSafe(head.address), M, doc.y + 1, { width, align: 'right' })
  doc.y = Math.max(doc.y, top + 54)
  doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(0.7).strokeColor(LINE).stroke()
  doc.moveDown(1)

  doc.fillColor(MID).font('Helvetica').fontSize(10).text(pdfSafe(r.date), M, doc.y, { width })
  doc.moveDown(0.8)
  doc.fillColor(MID).font('Helvetica-Bold').fontSize(8.5).text('PRIVATE AND CONFIDENTIAL', M, doc.y, { width, characterSpacing: 0.6 })
  doc.moveDown(0.3)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(pdfSafe(r.recipient.name), M, doc.y, { width })
  if (r.recipient.role) doc.fillColor(MID).font('Helvetica').fontSize(10).text(pdfSafe(r.recipient.role), M, doc.y, { width })
  doc.moveDown(1)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11.5).text(pdfSafe(r.subject), M, doc.y, { width })
  doc.moveDown(0.8)

  let prev: string | null = null
  for (const b of r.blocks) {
    if (prev === 'li' && b.t !== 'li') doc.moveDown(0.45)   // a little air after a list
    prev = b.t
    if (b.t === 'li') {
      ensure(16)
      const y = doc.y
      doc.fillColor(INK).font('Helvetica').fontSize(10.5).text('•', M + 6, y, { width: 12, lineBreak: false })
      doc.text(pdfSafe(b.text), M + 20, y, { width: width - 20, lineGap: 2 })
      doc.moveDown(0.25)
    } else if (b.t === 'h') {
      ensure(40); doc.moveDown(0.3); doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(pdfSafe(b.text), M, doc.y, { width }); doc.moveDown(0.3)
    } else {
      ensure(30)
      doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(pdfSafe(b.text), M, doc.y, { width, lineGap: 2.5, align: 'left' })
      doc.moveDown(0.7)
    }
  }

  ensure(90)
  doc.moveDown(0.3)
  doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(pdfSafe(r.closing), M, doc.y, { width })
  doc.moveDown(2.4)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(pdfSafe(r.signOff.name), M, doc.y, { width })
  if (r.signOff.role) doc.fillColor(MID).font('Helvetica').fontSize(10).text(pdfSafe(r.signOff.role), M, doc.y, { width })

  if (r.acknowledgement) {
    ensure(130)
    doc.moveDown(1.6)
    const y = doc.y
    doc.rect(M, y, width, 108).lineWidth(0.7).strokeColor(LINE).stroke()
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(pdfSafe(r.acknowledgement), M + 12, y + 10, { width: width - 24, lineGap: 2 })
    const ly = y + 80
    doc.moveTo(M + 12, ly).lineTo(M + 12 + 240, ly).lineWidth(0.6).strokeColor(MID).stroke()
    doc.moveTo(M + 280, ly).lineTo(M + width - 12, ly).stroke()
    doc.fillColor(MID).font('Helvetica').fontSize(8.5).text('Signed', M + 12, ly + 3, { lineBreak: false })
    doc.text('Date', M + 280, ly + 3, { lineBreak: false })
    doc.y = y + 116
  }

  // Page numbers when the letter runs to more than one page.
  const range = doc.bufferedPageRange()
  if (range.count > 1) {
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      doc.page.margins.bottom = 0
      doc.fillColor(MID).font('Helvetica').fontSize(8).text(`Page ${i + 1} of ${range.count}`, M, H - 32, { width, align: 'center', lineBreak: false })
    }
  }
  doc.end()
  return done
}
