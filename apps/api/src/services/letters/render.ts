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

// ── The formal document: PDF, Word and the on screen preview all come from one layout ──────────────
import type { Letterhead } from './letterhead'
import type { LayoutDoc, SignatureImage } from './layout'
export type { Letterhead }

export interface Signer { name: string; role?: string; signature?: SignatureImage | null }

/** The letter as a layout: the rendered text on the organisation's letterhead. When a signer is given, their printed name and job title replace the sign off, and their signature
 *  picture is shown only when it was passed in (the caller passes it only for the person who chose to sign with their own signature). */
export function letterLayout(t: LetterTemplate, values: Values, head: Letterhead, signer?: Signer | null): LayoutDoc {
  const r = renderLetter(t, values)
  return {
    kind: 'letter', head, date: r.date, confidential: true,
    recipient: { name: r.recipient.name, role: r.recipient.role || undefined },
    subject: r.subject,
    blocks: r.blocks.map(b => ({ t: b.t, text: b.text })),
    closing: r.closing,
    signer: signer?.name ? { name: signer.name, role: signer.role, signature: signer.signature ?? null } : { name: r.signOff.name, role: r.signOff.role || undefined, signature: null },
    acknowledgement: r.acknowledgement,
  }
}

/** The letter as a PDF on the service's letterhead. pdfkit and the policy PDF helpers are loaded when this is called, so everything else in this module works without them. */
export async function renderLetterPdf(t: LetterTemplate, values: Values, head: Letterhead, signer?: Signer | null, stamp?: string): Promise<Buffer> {
  const { renderLayoutPdf } = await import('./layout-pdf')
  return renderLayoutPdf({ ...letterLayout(t, values, head, signer), ...(stamp ? { stamp } : {}) })
}

/** The same letter as a Word document. */
export async function renderLetterDocx(t: LetterTemplate, values: Values, head: Letterhead, signer?: Signer | null, stamp?: string): Promise<Buffer> {
  const { renderLayoutDocx } = await import('./layout-docx')
  return renderLayoutDocx({ ...letterLayout(t, values, head, signer), ...(stamp ? { stamp } : {}) })
}
