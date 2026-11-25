// Changing a newsletter inside the Ask panel: its colours (overall and per block) and the blocks a tenant adds, moves, copies or deletes. Everything here is plain code with no
// database and no model: the routes and the agent's tools call it, so both do exactly the same thing and both are checked the same way.
//
// What is stored on the document (all optional, so older drafts are unchanged):
//   data.accent        the colour of the whole newsletter (a hex that reads on white), else the account's brand colour, else the category's own colour
//   data.block_styles  { blockId: 'soft' | 'bold' | 'outline' | 'none' }  the look of one block
//   data.custom_blocks [{ id, type, after, content }]  blocks the tenant added; `after` is the id of the block each one follows (empty = the top)
// The template's own sections live in the body text (## headings). Moving or deleting one rewrites the body, so the text, the designed view, the PDF and the email never disagree.
import { BLOCK_STYLES, ICONS, parseSections, sectionIds, type CustomIn, type CustomKind } from './newsletter-design'
import { validateBrandColour, SWATCHES } from '../../lib/brand-colour'
import { contrast } from './newsletter-design'

export const BLOCK_TYPES: Array<{ id: CustomKind; label: string; hint: string }> = [
  { id: 'text', label: 'Text', hint: 'A heading and a few paragraphs.' },
  { id: 'picture_text', label: 'Picture and text', hint: 'A picture with words beside it.' },
  { id: 'quote', label: 'Quote', hint: 'A quote and who said it.' },
  { id: 'callout', label: 'Callout', hint: 'A coloured panel with an icon, for something to stand out.' },
  { id: 'button', label: 'Button or link', hint: 'A button that opens a web address or the staff hub.' },
  { id: 'numbers', label: 'Big numbers', hint: 'Two to four numbers with a label each.' },
  { id: 'list', label: 'List', hint: 'Bullets or ticks.' },
  { id: 'dates', label: 'Dates', hint: 'A short table of dates and what is happening.' },
]
export const MAX_CUSTOM = 12
export const MAX_BLOCKS = 24
export const CALLOUT_ICONS = ['megaphone', 'star', 'heart', 'calendar', 'check', 'users', 'book', 'shield', 'sun', 'clock', 'gift', 'snow'] as const

/** Ready made colour sets. Every one reads on white (4.5 to 1 or better); a test checks it, and the picker never offers one that fails. */
export const PALETTES: Array<{ id: string; label: string; accent: string }> = [
  { id: 'teal', label: 'CareStream teal', accent: '#0F766E' },
  { id: 'ocean', label: 'Ocean blue', accent: '#1D4E89' },
  { id: 'forest', label: 'Forest green', accent: '#15803D' },
  { id: 'plum', label: 'Plum', accent: '#7C3AED' },
  { id: 'berry', label: 'Berry', accent: '#BE185D' },
  { id: 'terracotta', label: 'Terracotta', accent: '#B4411E' },
  { id: 'bronze', label: 'Bronze', accent: '#B45309' },
  { id: 'slate', label: 'Slate', accent: '#334155' },
]
export const PALETTE_SWATCHES = SWATCHES

/** The overall colour: empty goes back to the default, otherwise a hex that reads on white. "make it blue" style words are turned into a colour by the agent, never guessed here. */
export function validateAccent(input: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  const r = validateBrandColour(input)
  return r.ok ? { ok: true, value: r.value } : { ok: false, message: r.message }
}

// ── the images of picture blocks ────────────────────────────────────────────────────────
export const BLOCK_IMAGE_ID = /^[a-f0-9-]{36}\.(png|jpg|webp)$/
export const blockImageKey = (tenantId: string, imageId: string) => `tenants/${tenantId}/newsletter-block-images/${imageId}`
export const BLOCK_IMAGE_MAX_BYTES = 1024 * 1024

// ── checking what a person typed into a block ───────────────────────────────────────────
const clean = (v: unknown, max: number): string => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
export type Cleaned = { ok: true; content: any; texts: string[] } | { ok: false; message: string }
const bad = (message: string): Cleaned => ({ ok: false, message })
export const isHttps = (u: string) => /^https:\/\/[^\s"'<>]+$/i.test(u) && u.length <= 300 && /^https:\/\/[^/@]+\.[^/@]+/i.test(u)

/** Turns what the form sent into the content stored for a block, or says plainly what is wrong. `texts` is every visible word, for the house rules check. */
export function cleanContent(type: string, raw: any): Cleaned {
  const x = raw && typeof raw === 'object' ? raw : {}
  switch (type) {
    case 'text': {
      const heading = clean(x.heading, 80), text = clean(x.text, 1500)
      if (!text) return bad('Write the text for this block.')
      return { ok: true, content: { heading, text }, texts: [heading, text] }
    }
    case 'picture_text': {
      const heading = clean(x.heading, 80), text = clean(x.text, 800), alt = clean(x.alt, 120), image_id = String(x.image_id ?? '')
      if (!BLOCK_IMAGE_ID.test(image_id)) return bad('Add a picture first (png, jpg or webp, up to 1 MB).')
      if (!alt) return bad('Describe the picture in a few words, so it can be read out to people who cannot see it.')
      if (!text) return bad('Write the words that go beside the picture.')
      return { ok: true, content: { heading, text, alt, image_id, side: x.side === 'right' ? 'right' : 'left' }, texts: [heading, text, alt] }
    }
    case 'quote': {
      const text = clean(x.text, 300), who = clean(x.who, 80)
      if (!text) return bad('Write the quote.')
      return { ok: true, content: { text, who }, texts: [text, who] }
    }
    case 'callout': {
      const title = clean(x.title, 80), text = clean(x.text, 400)
      if (!text) return bad('Write the words for the callout.')
      const icon = (CALLOUT_ICONS as readonly string[]).includes(String(x.icon)) && String(x.icon) in ICONS ? String(x.icon) : 'megaphone'
      return { ok: true, content: { title, text, icon }, texts: [title, text] }
    }
    case 'button': {
      const label = clean(x.label, 40), kind = x.kind === 'hub' ? 'hub' : 'url'
      if (!label) return bad('Say what the button should say.')
      if (kind === 'hub') return { ok: true, content: { label, kind: 'hub' }, texts: [label] }
      const url = String(x.url ?? '').trim()
      if (!isHttps(url)) return bad('A button can open a web address that starts with https://, or the staff hub. Other kinds of link are not allowed.')
      return { ok: true, content: { label, kind: 'url', url }, texts: [label] }
    }
    case 'numbers': {
      const items = (Array.isArray(x.items) ? x.items : []).slice(0, 4).map((r: any) => ({ n: clean(r?.n, 8), label: clean(r?.label, 40) })).filter((r: any) => r.n || r.label)
      if (items.length < 2) return bad('Add at least two numbers, each with a label.')
      if (items.some((r: any) => !r.n || !r.label)) return bad('Each number needs a label, and each label a number.')
      const heading = clean(x.heading, 80)
      return { ok: true, content: { heading, items }, texts: [heading, ...items.flatMap((r: any) => [r.n, r.label])] }
    }
    case 'list': {
      const items = (Array.isArray(x.items) ? x.items : []).slice(0, 10).map((t: unknown) => clean(t, 120)).filter(Boolean)
      if (!items.length) return bad('Add at least one item to the list.')
      const heading = clean(x.heading, 80)
      return { ok: true, content: { heading, style: x.style === 'ticks' ? 'ticks' : 'bullets', items }, texts: [heading, ...items] }
    }
    case 'dates': {
      const rows = (Array.isArray(x.rows) ? x.rows : []).slice(0, 8).map((r: any) => ({ date: clean(r?.date, 28).replace(/:/g, ''), what: clean(r?.what, 100) })).filter((r: any) => r.date || r.what)
      if (!rows.length) return bad('Add at least one date and what is happening.')
      if (rows.some((r: any) => !r.date || !r.what)) return bad('Each row needs a date and what is happening.')
      const heading = clean(x.heading, 80)
      return { ok: true, content: { heading, rows }, texts: [heading, ...rows.flatMap((r: any) => [r.date, r.what])] }
    }
  }
  return bad('That is not a kind of block this newsletter can have.')
}

// ── the list the editor shows, and the operations on it ─────────────────────────────────
export interface EditItem { id: string; kind: 'section' | 'custom'; type: string; title: string; summary: string; style: string | null; can_edit: boolean }
export interface EditState { body: string; data: any }
export type Op =
  | { op: 'add'; type: string; content: any; after?: string | null }
  | { op: 'update'; id: string; content: any }
  | { op: 'update_section'; id: string; title?: string; text?: string }
  | { op: 'delete'; id: string }
  | { op: 'duplicate'; id: string }
  | { op: 'move'; id: string; dir: 'up' | 'down' }
  | { op: 'style'; id: string; style: string | null }
  | { op: 'reset_styles' }
  | { op: 'accent'; accent: string | null }
export type OpResult = { ok: true; state: EditState; texts: string[]; id?: string } | { ok: false; message: string }

const customsOf = (data: any): CustomIn[] => (Array.isArray(data?.custom_blocks) ? data.custom_blocks.filter((c: any) => c && typeof c.id === 'string') : [])
const stylesOf = (data: any): Record<string, string> => (data?.block_styles && typeof data.block_styles === 'object' ? { ...data.block_styles } : {})

/** Body text from its parts again (the same simple format the agent writes). */
function writeBody(intro: Array<{ t: 'p' | 'li'; text: string }>, secs: Array<{ title: string; blocks: Array<{ t: 'p' | 'li'; text: string }> }>): string {
  const lines = (bl: Array<{ t: 'p' | 'li'; text: string }>) => bl.map(b => (b.t === 'li' ? `- ${b.text}` : b.text)).join('\n')
  const parts: string[] = []
  if (intro.length) parts.push(lines(intro))
  for (const s of secs) parts.push(`## ${s.title}${s.blocks.length ? '\n' + lines(s.blocks) : ''}`)
  return parts.join('\n\n')
}
const summaryOf = (blocks: Array<{ text: string }>) => blocks.map(b => b.text).join(' ').replace(/\s+/g, ' ').slice(0, 90)
const customSummary = (c: any): string => {
  const x = c.content ?? {}
  if (c.type === 'numbers') return (x.items ?? []).map((r: any) => `${r.n} ${r.label}`).join(', ').slice(0, 90)
  if (c.type === 'list') return (x.items ?? []).join(', ').slice(0, 90)
  if (c.type === 'dates') return (x.rows ?? []).map((r: any) => `${r.date} ${r.what}`).join(', ').slice(0, 90)
  if (c.type === 'button') return String(x.label ?? '')
  return String(x.heading || x.title || x.text || '').slice(0, 90)
}

/** Every block in the order it is shown: the template's sections with the tenant's own blocks after the ones they follow. */
export function listItems(body: string, data: any): EditItem[] {
  const { sections } = parseSections(body)
  const ids = sectionIds(sections.map(s => s.title))
  const styles = stylesOf(data)
  const customs = customsOf(data)
  const label = (t: string) => BLOCK_TYPES.find(b => b.id === t)?.label ?? t
  const secItem = (i: number): EditItem => ({ id: ids[i], kind: 'section', type: 'section', title: sections[i].title, summary: summaryOf(sections[i].blocks), style: styles[ids[i]] ?? null, can_edit: true })
  const cItem = (c: any): EditItem => ({ id: c.id, kind: 'custom', type: c.type, title: String(c.content?.heading || c.content?.title || label(c.type)), summary: customSummary(c), style: styles[c.id] ?? null, can_edit: true })
  const out: EditItem[] = [], seen = new Set<string>()
  const allIds = new Set<string>([...ids, ...customs.map(c => c.id)])
  const place = (after: string | null) => { for (const c of customs) if ((c.after || null) === after && !seen.has(c.id)) { seen.add(c.id); out.push(cItem(c)); place(c.id) } }
  place(null)
  sections.forEach((_s, i) => { out.push(secItem(i)); place(ids[i]) })
  for (const c of customs) if (!seen.has(c.id) && !(c.after && allIds.has(c.after))) { seen.add(c.id); out.push(cItem(c)); place(c.id) }
  for (const c of customs) if (!seen.has(c.id)) { seen.add(c.id); out.push(cItem(c)) }
  return out
}

/** Writes an order of ids back into the body (sections) and the blocks (each now follows the item before it). */
function rebuild(state: EditState, order: string[], drop: Set<string> = new Set()): EditState {
  const { intro, sections } = parseSections(state.body)
  const sids = sectionIds(sections.map(s => s.title))
  const byId = new Map(sections.map((s, i) => [sids[i], s]))
  const keep = order.filter(id => !drop.has(id))
  const newSecs = keep.filter(id => byId.has(id)).map(id => byId.get(id)!)
  const customs = customsOf(state.data), cById = new Map(customs.map(c => [c.id, c]))
  const newCustoms: CustomIn[] = []
  keep.forEach((id, i) => { const c = cById.get(id); if (c) newCustoms.push({ ...c, after: i === 0 ? null : keep[i - 1] }) })
  const styles = stylesOf(state.data)
  for (const k of Object.keys(styles)) if (!keep.includes(k) && k !== 'gift') delete styles[k]
  const data = { ...(state.data ?? {}) }
  if (newCustoms.length) data.custom_blocks = newCustoms; else delete data.custom_blocks
  if (Object.keys(styles).length) data.block_styles = styles; else delete data.block_styles
  return { body: writeBody(intro, newSecs), data }
}

/** What a whole new id looks like: c1, c2 and so on, one above the biggest in use. */
const nextId = (customs: CustomIn[]) => 'c' + (1 + Math.max(0, ...customs.map(c => Number(/^c(\d+)$/.exec(c.id)?.[1] ?? 0))))

export function applyOp(state: EditState, op: Op): OpResult {
  const items = listItems(state.body, state.data)
  const order = items.map(i => i.id)
  const customs = customsOf(state.data)
  const find = (id: unknown) => items.find(i => i.id === String(id))
  switch (op.op) {
    case 'add': {
      if (customs.length >= MAX_CUSTOM) return { ok: false, message: `A newsletter can have up to ${MAX_CUSTOM} blocks of your own. Remove one first.` }
      if (items.length >= MAX_BLOCKS) return { ok: false, message: 'This newsletter already has plenty of blocks. Remove one first.' }
      const c = cleanContent(String(op.type), op.content); if (!c.ok) return c
      const after = op.after == null || op.after === '' ? null : String(op.after)
      if (after && !find(after)) return { ok: false, message: 'The block to add it after was not found.' }
      const id = nextId(customs)
      const at = after ? order.indexOf(after) + 1 : 0
      const data = { ...(state.data ?? {}), custom_blocks: [...customs, { id, type: op.type as CustomKind, after, content: c.content }] }
      const next = rebuild({ body: state.body, data }, [...order.slice(0, at), id, ...order.slice(at)])
      return { ok: true, state: next, texts: c.texts, id }
    }
    case 'update': {
      const cur = customs.find(c => c.id === op.id); if (!cur) return { ok: false, message: 'That block was not found.' }
      const c = cleanContent(cur.type, op.content); if (!c.ok) return c
      const data = { ...(state.data ?? {}), custom_blocks: customs.map(x => (x.id === cur.id ? { ...x, content: c.content } : x)) }
      return { ok: true, state: { body: state.body, data }, texts: c.texts, id: cur.id }
    }
    case 'update_section': {
      const { intro, sections } = parseSections(state.body); const sids = sectionIds(sections.map(s => s.title))
      const i = sids.indexOf(String(op.id)); if (i < 0) return { ok: false, message: 'That block was not found.' }
      const title = clean(op.title ?? sections[i].title, 90)
      if (!title) return { ok: false, message: 'A block needs a heading.' }
      const blocks = op.text === undefined ? sections[i].blocks : parseSections(`## x\n${String(op.text).replace(/\r\n?/g, '\n')}`).sections[0]?.blocks ?? []
      const secs = sections.map((s, k) => (k === i ? { title, blocks } : s))
      const body = writeBody(intro, secs)
      const newIds = sectionIds(secs.map(s => s.title))
      const data = { ...(state.data ?? {}) }
      if (newIds[i] !== sids[i]) {   // a new heading is a new id: the look and the blocks that followed it move across
        const st = stylesOf(data); if (st[sids[i]]) { st[newIds[i]] = st[sids[i]]; delete st[sids[i]]; data.block_styles = st }
        if (customs.length) data.custom_blocks = customs.map(c => (c.after === sids[i] ? { ...c, after: newIds[i] } : c))
      }
      return { ok: true, state: { body, data }, texts: [title, ...blocks.map(b => b.text)], id: newIds[i] }
    }
    case 'delete': {
      const it = find(op.id); if (!it) return { ok: false, message: 'That block was not found.' }
      const { sections } = parseSections(state.body)
      if (it.kind === 'section' && sections.length <= 1 && !customs.length) return { ok: false, message: 'A newsletter needs at least one block.' }
      const next = rebuild(state, order, new Set([it.id]))
      return { ok: true, state: next, texts: [] }
    }
    case 'duplicate': {
      const cur = customs.find(c => c.id === op.id); if (!cur) return { ok: false, message: 'Only blocks you added can be copied. Edit the original instead.' }
      if (customs.length >= MAX_CUSTOM) return { ok: false, message: `A newsletter can have up to ${MAX_CUSTOM} blocks of your own.` }
      const id = nextId(customs), at = order.indexOf(cur.id) + 1
      const data = { ...(state.data ?? {}), custom_blocks: [...customs, { ...cur, id, content: JSON.parse(JSON.stringify(cur.content)) }] }
      const st = stylesOf(data); if (st[cur.id]) { st[id] = st[cur.id]; data.block_styles = st }
      return { ok: true, state: rebuild({ body: state.body, data }, [...order.slice(0, at), id, ...order.slice(at)]), texts: [], id }
    }
    case 'move': {
      const i = order.indexOf(String(op.id)); if (i < 0) return { ok: false, message: 'That block was not found.' }
      const j = op.dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= order.length) return { ok: true, state, texts: [], id: String(op.id) }
      const o = [...order]; [o[i], o[j]] = [o[j], o[i]]
      return { ok: true, state: rebuild(state, o), texts: [], id: String(op.id) }
    }
    case 'style': {
      const id = String(op.id)
      if (id !== 'gift' && !find(id)) return { ok: false, message: 'That block was not found.' }
      const st = stylesOf(state.data)
      if (op.style == null || op.style === '') delete st[id]
      else if ((BLOCK_STYLES as readonly string[]).includes(String(op.style))) st[id] = String(op.style)
      else return { ok: false, message: 'Choose soft, bold, outline or none.' }
      const data = { ...(state.data ?? {}) }; if (Object.keys(st).length) data.block_styles = st; else delete data.block_styles
      return { ok: true, state: { body: state.body, data }, texts: [] }
    }
    case 'reset_styles': {
      const data = { ...(state.data ?? {}) }; delete data.block_styles
      return { ok: true, state: { body: state.body, data }, texts: [] }
    }
    case 'accent': {
      const v = validateAccent(op.accent); if (!v.ok) return v
      const data = { ...(state.data ?? {}) }; if (v.value) data.accent = v.value; else delete data.accent
      return { ok: true, state: { body: state.body, data }, texts: [] }
    }
  }
  return { ok: false, message: 'That change is not one this newsletter can make.' }
}

/** Palettes that fail the readability bar are never shown (a safety net: the fixed set above passes). */
export const usablePalettes = () => PALETTES.filter(p => contrast(p.accent, '#FFFFFF') >= 4.5)
