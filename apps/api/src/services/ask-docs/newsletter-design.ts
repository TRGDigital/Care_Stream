// The DESIGNED staff newsletter: one design model (colours, blocks, rows) that feeds the email safe HTML (also shown in the Ask panel and the staff hub) and the PDF, so all of
// them look the same. Nothing here calls a model: the same template, text and branding always give the same result.
//
// Look: light only (white page, soft tinted panels, no dark bands). Each CATEGORY has its own feel (whole team warm, compliance and care calm, rota and pay clean and practical,
// culture bright). The accent colour is the organisation's own brand colour when one is given (and readable on white), else the category's colour. Each LAYOUT arranges the same
// blocks differently: short is one column, standard is a hero then a two column grid, detailed adds a pull quote band, a call to action panel and a footer panel.
// Email HTML uses tables and inline styles only: no scripts, no web fonts, no external styles. The web version adds small inline SVG line icons; email uses simple glyphs.
// Privacy: a photo is shown only when the caller passes one (the administrator ticked it); email never carries a photo, only initials.
import { NEWSLETTER_TEMPLATES, newsletterTemplate, NEWSLETTER_CATEGORIES, type NewsletterTemplate, type NewsletterSection } from './newsletter-templates'

export type Target = 'email' | 'web'
export type Role = 'hero' | 'person' | 'quote' | 'cta' | 'dates' | 'chips' | 'thanks' | 'list' | 'plain'
export type IconName = 'megaphone' | 'star' | 'heart' | 'calendar' | 'check' | 'users' | 'book' | 'shield' | 'sun' | 'clock' | 'gift' | 'quote' | 'arrow' | 'snow'
export interface Brand { name: string; accent?: string | null; /** A data URL (web, PDF) or an https address (email). */ logo?: string | null; contact?: string[] }
export interface DesignInput {
  templateId?: string | null; title: string; body: string; brand: Brand; sentBy?: string; monthText?: string
  /** A person's photo, only when the administrator ticked to include it. Never shown in email. */
  photo?: { dataUrl: string; name?: string; inHub?: boolean } | null
  /** The featured people (employees of the month, a story, new starters), each only with a recorded agreement. One or more; `photo` above is the old single person and is read as a list of one. */
  people?: Array<{ dataUrl: string; name?: string; inHub?: boolean }>
  /** An optional gift for the featured people: words, and a picture only on the screen, PDF and hub (never in email, which shows the gift icon and the words). */
  gift?: { text: string; dataUrl?: string | null } | null
  /** Where a button may point (the staff hub); without one the call to action is a plain panel, never a button that goes nowhere. */
  links?: { holiday?: string | null; hub?: string | null }
  /** Per block look, keyed by block id (see sectionIds and the custom block ids). */
  styles?: Record<string, string>
  /** Blocks the tenant added, in order, each placed after another block (or at the top when `after` is empty). */
  custom?: CustomIn[]
  /** Pictures for picture blocks, by block id (screen and PDF only; email shows the words and a note). */
  customImages?: Record<string, CustomImage>
  /** A4 portrait (the default) or landscape. Landscape lays the blocks out in columns so it reads well wide. */
  orientation?: 'portrait' | 'landscape'
  sample?: boolean
  /** Printed at the top of every PDF page when the copy is not final (a draft or a sample). */
  stamp?: string
}
export interface Block { t: 'p' | 'li'; text: string }
/** The kinds of block a tenant can add themselves (content is checked in newsletter-edit.ts before it is ever stored). */
export type CustomKind = 'text' | 'picture_text' | 'quote' | 'callout' | 'button' | 'numbers' | 'list' | 'dates'
export interface CustomIn { id: string; type: CustomKind; after?: string | null; content: any }
export interface CustomImage { dataUrl: string; buffer?: Buffer | null }
/** The look a block can be given: soft tint, bold (the accent colour with white words), white with an outline, or none (plain). Anything else means "as the design has it". */
export const BLOCK_STYLES = ['soft', 'bold', 'outline', 'none'] as const
export type BlockStyle = (typeof BLOCK_STYLES)[number]
export interface Sec { id: string; key: string | null; title: string; role: Role; icon: IconName; blocks: Block[]; first?: boolean; custom?: CustomIn }
export interface Row { kind: 'hero' | 'full' | 'pair' | 'quote' | 'cta' | 'footer' | 'gift' | 'custom'; cells: Sec[]; /** For a row of columns: how each cell is drawn (a quote, a call to action or the gift keep their own look in a column). */ cellKinds?: Array<Row['kind']> }
export interface Look { id: string; label: string; accent: string; accent2: string | null; radius: number; headFont: string; cardStyle: 'soft' | 'rule' | 'plain' | 'outline'; iconShape: 'circle' | 'square' }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
const INK = '#1F2937', MUTED = '#4B5563', LINE = '#E5E7EB', PAGE = '#F3F4F6'
const WHITE = '#FFFFFF'

// ── colour helpers ────────────────────────────────────────────────────────────────────
const hex = (h: string) => { const m = /^#([0-9a-f]{6})$/i.exec(h.trim()); return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null }
const toHex = (r: number[]) => '#' + r.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => { const x = hex(a)!, y = hex(b)!; return toHex(x.map((v, i) => v + (y[i] - v) * t)) }
export function luminance(h: string): number { const c = hex(h); if (!c) return 0; const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
export const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

export const LOOKS: Record<string, Look> = {
  'whole-team': { id: 'whole-team', label: 'Whole team', accent: '#B4411E', accent2: '#F59E0B', radius: 18, headFont: "Georgia,'Times New Roman',serif", cardStyle: 'soft', iconShape: 'circle' },
  'compliance-care': { id: 'compliance-care', label: 'Compliance and care', accent: '#0F766E', accent2: null, radius: 8, headFont: SANS, cardStyle: 'rule', iconShape: 'square' },
  'rota-pay': { id: 'rota-pay', label: 'Rota and pay', accent: '#1D4E89', accent2: null, radius: 4, headFont: SANS, cardStyle: 'plain', iconShape: 'square' },
  culture: { id: 'culture', label: 'Culture', accent: '#7C3AED', accent2: '#F59E0B', radius: 22, headFont: "Georgia,'Times New Roman',serif", cardStyle: 'outline', iconShape: 'circle' },
}
export interface Palette { accent: string; dark: string; tint: string; tint2: string; accent2: string | null }
/** The brand colour is used only when it is a valid colour that reads on white (4.5 to 1 or better); otherwise the category's own colour. */
export function paletteFor(look: Look, brand?: string | null): Palette {
  const ok = brand && hex(brand) && contrast(brand, '#FFFFFF') >= 4.5
  const accent = ok ? brand!.trim().toUpperCase() : look.accent
  return { accent, dark: mix(accent, '#000000', 0.35), tint: mix(accent, '#FFFFFF', 0.92), tint2: mix(accent, '#FFFFFF', 0.82), accent2: look.accent2 }
}

// ── icons: line drawings on a 24 grid, used as SVG on the web and drawn with paths in the PDF ─────────────────────
const heartPts = (() => { const p: string[] = []; for (let i = 0; i <= 28; i++) { const t = (i / 28) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); p.push(`${(12 + x * 0.62).toFixed(1)} ${(11 - y * 0.62).toFixed(1)}`) } return 'M' + p.join(' L') + ' Z' })()
type Op = { d: string } | { c: [number, number, number] }
export const ICONS: Record<IconName, Op[]> = {
  megaphone: [{ d: 'M4 10 L4 14 L8 14 L15 18 L15 6 L8 10 Z' }, { d: 'M18 9 L19.5 12 L18 15' }],
  star: [{ d: 'M12 3 L14.6 8.6 L20.7 9.3 L16.2 13.4 L17.5 19.4 L12 16.4 L6.5 19.4 L7.8 13.4 L3.3 9.3 L9.4 8.6 Z' }],
  heart: [{ d: heartPts }],
  calendar: [{ d: 'M4.5 6 L19.5 6 L19.5 20 L4.5 20 Z' }, { d: 'M4.5 10.5 L19.5 10.5' }, { d: 'M8.5 3.5 L8.5 7.5' }, { d: 'M15.5 3.5 L15.5 7.5' }],
  check: [{ d: 'M5 12.5 L9.8 17 L19 7' }],
  users: [{ c: [9, 8, 3] }, { d: 'M3.5 19.5 L3.5 18 Q3.5 14.5 9 14.5 Q14.5 14.5 14.5 18 L14.5 19.5' }, { c: [17, 9, 2.4] }, { d: 'M16 14.6 Q20.5 14.6 20.5 18 L20.5 19' }],
  book: [{ d: 'M3.5 5.5 L11 5.5 L11 19.5 L3.5 19.5 Z' }, { d: 'M13 5.5 L20.5 5.5 L20.5 19.5 L13 19.5 Z' }],
  shield: [{ d: 'M12 3 L19 6 L19 11.5 Q19 17 12 21 Q5 17 5 11.5 L5 6 Z' }, { d: 'M9 12 L11.2 14.2 L15.2 9.8' }],
  sun: [{ c: [12, 12, 4] }, { d: 'M12 2.5 L12 5 M12 19 L12 21.5 M2.5 12 L5 12 M19 12 L21.5 12 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M18.7 5.3 L17 7 M7 17 L5.3 18.7' }],
  clock: [{ c: [12, 12, 8.5] }, { d: 'M12 7.5 L12 12 L15.2 13.8' }],
  gift: [{ d: 'M4 11 L20 11 L20 20 L4 20 Z' }, { d: 'M3 7.5 L21 7.5 L21 11 L3 11 Z' }, { d: 'M12 7.5 L12 20' }, { d: 'M12 7.5 L9 7.5 Q7 5 9 4 Q11.5 3.5 12 7.5 Z' }, { d: 'M12 7.5 L15 7.5 Q17 5 15 4 Q12.5 3.5 12 7.5 Z' }],
  quote: [{ d: 'M5 17 L5 12 Q5 8 9 7 M13 17 L13 12 Q13 8 17 7' }],
  arrow: [{ d: 'M4.5 12 L19 12 M13.5 6.5 L19 12 L13.5 17.5' }],
  snow: [{ d: 'M12 3 L12 21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5' }],
}
const GLYPH: Record<IconName, string> = { megaphone: '!', star: '&#9733;', heart: '&#9829;', calendar: '&#9638;', check: '&#10003;', users: '&#9786;', book: '&#9776;', shield: '&#10010;', sun: '&#9728;', clock: '&#9719;', gift: '&#9733;', quote: '&#8220;', arrow: '&#10140;', snow: '&#10052;' }
const svgIcon = (n: IconName, color: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;margin:0 auto" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n].map(o => 'd' in o ? `<path d="${o.d}"/>` : `<circle cx="${o.c[0]}" cy="${o.c[1]}" r="${o.c[2]}"/>`).join('')}</svg>`

// ── reading the draft: sections, roles, icons ────────────────────────────────────────
const KEY_ROLE: Record<string, Role> = {
  who: 'person', story: 'person', about: 'person', farewell: 'person', new_starters: 'person', fun_facts: 'person',
  quotes: 'quote', said: 'quote', words: 'quote', thoughts: 'quote', memories: 'quote',
  nominate: 'cta', how: 'cta', actions: 'cta', do: 'cta', next: 'cta', what_to_do: 'cta', raise: 'cta', whistle: 'cta', swaps: 'cta', help: 'cta', talk: 'cta', contacts: 'cta', who_to_ask: 'cta', team_question: 'cta',
  coming_up: 'dates', dates: 'dates', events: 'dates', busy: 'dates', timeline: 'dates', when: 'dates', deadline: 'dates', holiday: 'dates', due: 'dates',
  birthdays: 'chips', anniversaries: 'chips',
  thanks: 'thanks', thank_you: 'thanks',
  signs: 'list', tips: 'list', first_week: 'list', checks: 'list', hands: 'list', practical: 'list', checked: 'list', comfort: 'list', cleaning: 'list', breaks: 'list', safe: 'list', yourself: 'list', policies: 'list',
}
const KEY_ICON: Record<string, IconName> = {
  weather: 'sun', comfort: 'sun', safe: 'sun', vaccines: 'shield', infection: 'shield', hands: 'shield', outbreak: 'shield', lead: 'shield', signs: 'shield', raise: 'shield', whistle: 'shield', checks: 'shield', cleaning: 'shield',
  training: 'book', due: 'book', new: 'book', done: 'book', time: 'book', help: 'book', policies: 'book', evidence: 'book', where: 'book',
  holiday: 'calendar', busy: 'calendar', swaps: 'calendar', dates: 'calendar', coming_up: 'calendar', events: 'calendar', timeline: 'calendar', when: 'calendar', deadline: 'clock',
  rota: 'clock', cover: 'clock', pay: 'clock', rates: 'clock', breaks: 'clock', birthdays: 'gift', anniversaries: 'star', buddies: 'users', contacts: 'users', who_to_ask: 'users', talk: 'users', support: 'heart', well: 'heart', yourself: 'heart',
  festive: 'snow', traditions: 'snow', news: 'megaphone', message: 'megaphone', welcome: 'megaphone', opening: 'megaphone', intro: 'megaphone', headline: 'star', difference: 'star', why: 'star', who: 'star',
}
const ROLE_ICON: Record<Role, IconName> = { hero: 'megaphone', person: 'star', quote: 'quote', cta: 'arrow', dates: 'calendar', chips: 'gift', thanks: 'heart', list: 'check', plain: 'book' }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** A steady id for each section: the title in lower case with dashes, made unique. The same title always gives the same id, so styles survive moving a section. */
export function sectionIds(titles: string[]): string[] {
  const seen = new Map<string, number>()
  return titles.map(t => {
    const base = 's-' + (String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'section')
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  })
}
export function parseSections(body: string): { intro: Block[]; sections: Array<{ title: string; blocks: Block[] }> } {
  const intro: Block[] = [], sections: Array<{ title: string; blocks: Block[] }> = []
  let cur: { title: string; blocks: Block[] } | null = null, para: string[] = []
  const push = (b: Block) => (cur ? cur.blocks : intro).push(b)
  const flush = () => { if (para.length) { push({ t: 'p', text: para.join(' ').trim() }); para = [] } }
  for (const raw of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const h = /^#{1,3}\s+(.*)$/.exec(line), li = /^[-*]\s+(.*)$/.exec(line)
    if (h) { flush(); cur = { title: h[1].trim(), blocks: [] }; sections.push(cur) } else if (li) { flush(); push({ t: 'li', text: li[1].trim() }) } else para.push(line)
  }
  flush()
  return { intro, sections }
}
function roleFor(sec: NewsletterSection | null, title: string): Role {
  if (sec && KEY_ROLE[sec.key]) return KEY_ROLE[sec.key]
  const t = norm(title)
  if (/\b(colleagues said|quote|in their own words|you told us)\b/.test(t)) return 'quote'
  if (/\b(how to|what to do|who to ask|who to call|nominate)\b/.test(t)) return 'cta'
  if (/\b(thank)/.test(t)) return 'thanks'
  if (/\b(coming up|dates|deadline|diary)\b/.test(t)) return 'dates'
  if (/\b(birthday|anniversar)/.test(t)) return 'chips'
  return 'plain'
}
/** Matches each section the draft has to the template's sections (by title, then by position) and works out its role and icon. */
export function readSections(body: string, tpl: NewsletterTemplate | null): { intro: Block[]; secs: Sec[] } {
  const { intro, sections } = parseSections(body)
  const ids = sectionIds(sections.map(x => x.title))
  const secs: Sec[] = sections.map((s, i) => {
    const match = tpl ? (tpl.sections.find(t => norm(t.title) === norm(s.title)) ?? (tpl.sections.length === sections.length ? tpl.sections[i] : null)) : null
    const role = roleFor(match ?? null, s.title)
    const allBullets = s.blocks.length > 0 && s.blocks.every(b => b.t === 'li')
    const r: Role = role === 'plain' && allBullets ? 'list' : role
    return { id: ids[i], key: match?.key ?? null, title: s.title, role: r, icon: (match && KEY_ICON[match.key]) || ROLE_ICON[r], blocks: s.blocks, first: i === 0 }
  })
  return { intro, secs }
}

/** How the blocks are arranged. Short: one column. Standard: a hero, then a two column grid. Detailed: hero, grid, a pull quote band, a call to action panel, then a footer panel. */
export function arrange(secs: Sec[], layout: 'short' | 'standard' | 'detailed'): Row[] {
  if (!secs.length) return []
  if (layout === 'short') return secs.map((s, i) => ({ kind: i === 0 ? 'hero' : s.role === 'cta' ? 'cta' : 'full', cells: [s] }) as Row)
  const [hero, ...rest] = secs
  const rows: Row[] = [{ kind: 'hero', cells: [hero] }]
  const quote = layout === 'detailed' ? rest.find(s => s.role === 'quote') : undefined
  const ctas = layout === 'detailed' ? rest.filter(s => s.role === 'cta') : []
  const last = layout === 'detailed' && rest.length > 5 ? rest[rest.length - 1] : undefined
  const grid = rest.filter(s => s !== quote && !(ctas.includes(s)) && s !== last)
  const wide = (s: Sec) => s.role === 'quote' || (s.role === 'cta' && layout === 'standard') || s.blocks.some(b => b.t === 'p' && b.text.length > 420)
  let pending: Sec | null = null
  const midIndex = Math.ceil(grid.length / 2)
  const emit = (s: Sec) => {
    if (wide(s)) { if (pending) { rows.push({ kind: 'full', cells: [pending] }); pending = null } rows.push({ kind: s.role === 'quote' ? 'quote' : s.role === 'cta' ? 'cta' : 'full', cells: [s] }); return }
    if (pending) { rows.push({ kind: 'pair', cells: [pending, s] }); pending = null } else pending = s
  }
  grid.forEach((s, i) => { if (quote && i === midIndex) { if (pending) { rows.push({ kind: 'full', cells: [pending] }); pending = null } rows.push({ kind: 'quote', cells: [quote] }) } emit(s) })
  if (pending) rows.push({ kind: 'full', cells: [pending] })
  if (quote && !rows.some(r => r.cells[0] === quote)) rows.push({ kind: 'quote', cells: [quote] })
  for (const c of ctas) rows.push({ kind: 'cta', cells: [c] })
  if (last) rows.push({ kind: 'footer', cells: [last] })
  return rows
}

export interface Design {
  tpl: NewsletterTemplate | null; look: Look; pal: Palette; layout: 'short' | 'standard' | 'detailed'; title: string; month: string; kicker: string
  intro: Block[]; rows: Row[]; brand: Brand; sentBy: string; photo: DesignInput['photo']; people: NonNullable<DesignInput['people']>; gift: DesignInput['gift']; links: NonNullable<DesignInput['links']>; sample: boolean
  /** The colour of the words on the page and of the quieter words (white in a bold block). */
  ink: string; muted: string
  styles: Record<string, BlockStyle>; customImages: Record<string, CustomImage>
  orientation: 'portrait' | 'landscape'
}
/** A bold block: the accent colour behind white words. The accent already reads on white (4.5 to 1 or better), so white words on it always read too. */
export function boldDesign(d: Design): Design {
  return { ...d, ink: WHITE, muted: mix(d.pal.accent, WHITE, 0.82), pal: { ...d.pal, accent: WHITE, dark: WHITE, tint: d.pal.accent, tint2: mix(d.pal.accent, '#000000', 0.22) } }
}
/** Puts the tenant's own blocks into the rows: each one after the block it follows (a blocks after one that follows another stays in order), the ones with no place at the top, and any whose block has been deleted at the end. */
export function placeCustom(rows: Row[], custom: CustomIn[]): Row[] {
  if (!custom.length) return rows
  const ids = new Set<string>(rows.flatMap(r => r.cells.map(c => c.id)))
  const byAfter = new Map<string, CustomIn[]>()
  const head: CustomIn[] = [], orphans: CustomIn[] = []
  for (const c of custom) {
    const a = c.after || null
    if (!a) head.push(c)
    else if (ids.has(a) || custom.some(x => x.id === a)) byAfter.set(a, [...(byAfter.get(a) ?? []), c])
    else orphans.push(c)
  }
  const out: Row[] = []
  const seen = new Set<string>()
  const emit = (c: CustomIn) => { if (seen.has(c.id)) return; seen.add(c.id); out.push(customRow(c)); for (const k of byAfter.get(c.id) ?? []) emit(k) }
  head.forEach(emit)
  for (const r of rows) {
    if (r.kind === 'footer') { orphans.forEach(emit) }
    out.push(r)
    for (const cell of r.cells) for (const k of byAfter.get(cell.id) ?? []) emit(k)
  }
  orphans.forEach(emit)
  return out
}
const CUSTOM_ICON: Record<CustomKind, IconName> = { text: 'book', picture_text: 'star', quote: 'quote', callout: 'megaphone', button: 'arrow', numbers: 'star', list: 'check', dates: 'calendar' }
function customRow(c: CustomIn): Row {
  const x = c.content ?? {}
  const title = String(x.heading ?? x.title ?? '')
  const blocks: Block[] = c.type === 'list' ? (Array.isArray(x.items) ? x.items : []).map((t: string) => ({ t: 'li' as const, text: String(t) }))
    : c.type === 'dates' ? (Array.isArray(x.rows) ? x.rows : []).map((r: any) => ({ t: 'li' as const, text: `${r.date}: ${r.what}` }))
    : c.type === 'numbers' ? (Array.isArray(x.items) ? x.items : []).map((r: any) => ({ t: 'li' as const, text: `${r.n} ${r.label}` }))
    : c.type === 'quote' ? [{ t: 'p' as const, text: String(x.text ?? '') }]
    : [{ t: 'p' as const, text: String(x.text ?? x.label ?? '') }]
  const icon = (c.type === 'callout' && x.icon && x.icon in ICONS ? x.icon : CUSTOM_ICON[c.type]) as IconName
  return { kind: 'custom', cells: [{ id: c.id, key: null, title, role: c.type === 'quote' ? 'quote' : c.type === 'dates' ? 'dates' : c.type === 'list' ? 'list' : 'plain', icon, blocks, custom: c }] }
}
/** Landscape: after the hero, the ordinary blocks sit three to a row (a wide page reads better in columns). Quotes, calls to action, the gift, the footer and the tenant's own blocks keep their own full width row. */
export function landscapeRows(rows: Row[]): Row[] {
  const out: Row[] = []
  let group: Array<{ s: Sec; k: Row['kind'] }> = []
  const flush = () => { while (group.length) { const take = group.length === 4 ? 2 : Math.min(3, group.length); const part = group.splice(0, take); out.push(part.length === 1 ? { kind: part[0].k === 'gift' ? 'gift' : part[0].k, cells: [part[0].s] } : { kind: 'pair', cells: part.map(x => x.s), cellKinds: part.map(x => x.k) }) } }
  for (const r of rows) {
    if (r.kind === 'hero' || r.kind === 'custom' || r.kind === 'footer') { flush(); out.push(r); continue }
    r.cells.forEach((c, i) => group.push({ s: c, k: r.kind === 'pair' ? 'full' : r.kind }))
  }
  flush()
  return out
}
/** More than one featured person: the wording turns plural ("Employees of the month"). One person leaves it as written. */
export function pluralise(text: string, n: number): string {
  if (n < 2) return text
  return text.replace(/\bemployee of the month\b/gi, m => (m[0] === 'E' ? 'Employees of the month' : 'employees of the month')).replace(/\bnew starter\b/gi, m => (m[0] === 'N' ? 'New starters' : 'new starters')).replace(/\bleaver\b/gi, m => (m[0] === 'L' ? 'Leavers' : 'leavers'))
}
const monthNow = () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/London' })
export function buildDesign(input: DesignInput): Design {
  const tpl = input.templateId ? newsletterTemplate(input.templateId) ?? null : null
  const look = LOOKS[tpl?.category ?? 'whole-team'] ?? LOOKS['whole-team']
  const layout = tpl?.layout ?? 'standard'
  const { intro, secs } = readSections(input.body, tpl)
  const kicker = tpl ? (NEWSLETTER_CATEGORIES.find(c => c.id === tpl.category)?.title ?? look.label) : 'Staff newsletter'
  const people = input.people ?? (input.photo ? [input.photo] : [])
  const n = people.length
  const rows0 = arrange(secs, layout).map(r => ({ ...r, cells: r.cells.map(c => ({ ...c, title: pluralise(c.title, n) })) }))
  const rows = placeCustom(rows0, (input.custom ?? []).slice(0, 12))
  const giftOn = !!(input.gift && (input.gift.text.trim() || input.gift.dataUrl)) || (!!input.sample && !!tpl && /^(employee-of-the-month|staff-stories|recognition)/.test(tpl.id))
  if (giftOn) { const at = rows.length && rows[rows.length - 1].kind === 'footer' ? rows.length - 1 : rows.length; rows.splice(at, 0, { kind: 'gift', cells: [{ id: 'gift', key: 'gift', title: n > 1 ? 'Their gifts' : 'Their gift', role: 'plain', icon: 'gift', blocks: [{ t: 'p', text: input.gift?.text?.trim() || '[What the gift is, for example a voucher or an extra day off]' }] }] }) }
  const orientation: 'portrait' | 'landscape' = input.orientation === 'landscape' ? 'landscape' : 'portrait'
  const rowsOut = orientation === 'landscape' ? landscapeRows(rows) : rows
  return { orientation, tpl, look, pal: paletteFor(look, input.brand.accent), layout, title: pluralise(String(input.title || tpl?.type_title || 'Staff newsletter'), n).slice(0, 140), month: input.monthText || monthNow(), kicker, intro, rows: rowsOut, brand: input.brand, sentBy: input.sentBy ?? '', photo: input.photo ?? people[0] ?? null, people, gift: input.gift ?? null, links: input.links ?? {}, sample: !!input.sample, ink: INK, muted: MUTED,
    styles: Object.fromEntries(Object.entries(input.styles ?? {}).filter(([, v]) => (BLOCK_STYLES as readonly string[]).includes(v))) as Record<string, BlockStyle>, customImages: input.customImages ?? {} }
}

/** Example copy for a template, built from its own section titles and hints, so the layouts can be shown before anything is written. Always shown marked as a sample. */
export function sampleBody(tpl: NewsletterTemplate): string {
  const parts: string[] = []
  for (const s of tpl.sections) {
    const role = roleFor(s as any, s.title)
    if (role === 'quote') parts.push(`## ${s.title}\n- A short quote from a colleague goes here.\n- Another kind word about the team.`)
    else if (role === 'chips') parts.push(`## ${s.title}\n- Sample name, 14 March\n- Sample name, 22 March`)
    else if (role === 'dates') parts.push(`## ${s.title}\n- Monday 8 December: the first date\n- Friday 19 December: the second date`)
    else parts.push(`## ${s.title}\n${s.hint}`)
  }
  return parts.join('\n\n')
}

// ── HTML (email safe tables with inline styles) ────────────────────────────────────────
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || ''
const first = (blocks: Block[]) => blocks.find(b => b.t === 'p')?.text ?? blocks[0]?.text ?? ''
const unquote = (s: string) => s.replace(/^["“‘']+|["”’']+$/g, '').trim()

function iconBubble(d: Design, name: IconName, t: Target, size = 36): string {
  const radius = d.look.iconShape === 'circle' ? '50%' : '8px'
  const inner = t === 'web' ? svgIcon(name, d.pal.accent, Math.round(size * 0.55)) : `<span style="font-size:${Math.round(size * 0.5)}px;line-height:${size}px;color:${d.pal.accent};font-weight:700">${GLYPH[name]}</span>`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;background:${d.pal.tint2};border-radius:${radius};text-align:center;vertical-align:middle;line-height:0;font-size:0">${inner}</td></tr></table>`
}
function bullets(d: Design, blocks: Block[], size = 15): string {
  const items = blocks.filter(b => b.t === 'li')
  if (!items.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items.map(b => `<tr><td width="20" valign="top" style="padding:3px 0;color:${d.pal.accent};font-size:${size}px;line-height:1.5;font-weight:700">&#10003;</td><td valign="top" style="padding:3px 0;font-size:${size}px;line-height:1.5;color:${d.ink}">${esc(b.text)}</td></tr>`).join('')}</table>`
}
function paras(blocks: Block[], size = 15, color = INK): string {
  return blocks.filter(b => b.t === 'p').map(b => `<p style="margin:0 0 10px;font-size:${size}px;line-height:1.6;color:${color}">${esc(b.text)}</p>`).join('')
}
function statTiles(d: Design, blocks: Block[]): string | null {
  const items = blocks.filter(b => b.t === 'li').map(b => /^(\d{1,4})\s+(.{2,60})$/.exec(b.text)).filter(Boolean) as RegExpExecArray[]
  if (items.length < 2 || items.length !== blocks.filter(b => b.t === 'li').length || items.length > 4) return null
  return tilesHtml(d, items.map(m => ({ n: m[1], label: m[2] })))
}
function tilesHtml(d: Design, items: Array<{ n: string; label: string }>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${items.map(m => `<td align="center" valign="top" style="padding:4px"><div style="background:${d.pal.tint};border-radius:${Math.min(d.look.radius, 14)}px;padding:12px 6px"><div style="font-size:30px;line-height:1.1;font-weight:700;color:${d.pal.accent};font-family:${d.look.headFont}">${esc(m.n)}</div><div style="font-size:13px;line-height:1.4;color:${d.muted};padding-top:4px">${esc(m.label)}</div></div></td>`).join('')}</tr></table>`
}
function chips(d: Design, blocks: Block[]): string {
  return `<div style="line-height:2.2">${blocks.map(b => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;background:${d.pal.tint};border:1px solid ${d.pal.tint2};border-radius:999px;font-size:14px;color:${d.ink}">${esc(b.text)}</span>`).join('')}</div>`
}
function dateRows(d: Design, blocks: Block[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${blocks.map(b => {
    const m = /^([^:]{3,28}):\s*(.+)$/.exec(b.text)
    return m ? `<tr><td valign="top" width="38%" style="padding:5px 10px 5px 0;font-size:14px;font-weight:700;color:${d.pal.dark};border-bottom:1px solid ${LINE}">${esc(m[1])}</td><td valign="top" style="padding:5px 0;font-size:14px;color:${d.ink};border-bottom:1px solid ${LINE}">${esc(m[2])}</td></tr>`
      : `<tr><td colspan="2" style="padding:5px 0;font-size:14px;color:${d.ink};border-bottom:1px solid ${LINE}">${esc(b.text)}</td></tr>`
  }).join('')}</table>`
}
/** A neutral silhouette for SAMPLE previews: never a real person. */
function silhouette(d: Design, size: number): string {
  const c = d.pal.accent
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Sample picture of a member of staff" style="display:block;border-radius:50%;background:${d.pal.tint2};border:3px solid ${d.pal.tint}"><circle cx="50" cy="38" r="17" fill="${c}" opacity=".55"/><path d="M16 96c2-22 15-34 34-34s32 12 34 34z" fill="${c}" opacity=".55"/></svg>`
}
function photoSlot(d: Design, t: Target, size: number, who: { dataUrl: string; name?: string; inHub?: boolean } | null = d.photo ?? null): string {
  const name = who?.name ?? ''
  if (d.sample && t === 'web' && !who?.dataUrl) return silhouette(d, size)
  if (t === 'web' && who?.dataUrl) return `<img src="${esc(who.dataUrl)}" alt="${esc(name ? `Photo of ${name}` : 'Photo')}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:3px solid ${d.pal.tint2}">`
  const ini = initials(name)
  const note = t === 'email' && who?.inHub && d.people.length <= 1 ? `<div style="font-size:11px;line-height:1.35;color:${d.muted};text-align:center;padding-top:6px;max-width:${size + 20}px">Their photo is in the hub and the PDF</div>` : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;border-radius:50%;background:${d.pal.tint2};border:3px solid ${d.pal.tint};font-size:${Math.round(size / 3)}px;font-weight:700;color:${d.pal.dark};text-align:center" role="img" aria-label="${esc(name ? `Picture slot for ${name}` : 'Picture slot')}">${ini ? esc(ini) : '&#9733;'}</td></tr></table>${note}`
}
/** One round picture, or two to four side by side with first names, or a tidy wrapped grid beyond that. */
function photoCluster(d: Design, t: Target): string {
  const list = d.people.length ? d.people : [null as any]
  if (list.length === 1) return photoSlot(d, t, 140, list[0])
  const size = list.length === 2 ? 104 : list.length <= 4 ? 84 : 68
  const cells = list.map((p: any) => `<td align="center" valign="top" style="padding:0 6px 8px">${photoSlot(d, t, size, p)}<div style="font-size:12px;line-height:1.3;color:${d.ink};padding-top:4px;max-width:${size + 12}px;text-align:center">${esc(String(p?.name ?? '').split(' ')[0])}</div></td>`)
  const per = list.length <= 4 ? list.length : 4
  const rows: string[] = []; for (let i = 0; i < cells.length; i += per) rows.push(`<tr>${cells.slice(i, i + per).join('')}</tr>`)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">${rows.join('')}</table>${t === 'email' && list.some((p: any) => p?.inHub) ? `<div style="clear:both;font-size:11px;line-height:1.35;color:${d.muted};text-align:right;padding-top:4px">Their photos are in the hub and the PDF</div>` : ''}`
}
/** Box colours for a block: the look the tenant chose for it, or the design's own for that kind of block. A bold block also gives back the design to draw its words with (white on the accent). */
type Box = { bg: string; border: string }
const cardDefault = (d: Design, tinted: boolean): Box => ({ bg: tinted || d.look.cardStyle === 'soft' ? d.pal.tint : WHITE, border: d.look.cardStyle === 'outline' ? `2px solid ${d.pal.tint2}` : d.look.cardStyle === 'rule' ? `1px solid ${LINE};border-left:5px solid ${d.pal.accent}` : `1px solid ${LINE}` })
function boxFor(d: Design, id: string, dflt: Box): Box & { dd: Design } {
  const st = d.styles[id]
  if (st === 'bold') return { dd: boldDesign(d), bg: d.pal.accent, border: `1px solid ${d.pal.accent}` }
  if (st === 'outline') return { dd: d, bg: WHITE, border: `2px solid ${d.pal.accent}` }
  if (st === 'none') return { dd: d, bg: WHITE, border: '0' }
  if (st === 'soft') return { dd: d, bg: d.pal.tint, border: `1px solid ${d.pal.tint2}` }
  return { dd: d, ...dflt }
}
const shell = (d: Design, bx: Box, inner: string, pad = '16px 18px', extra = '') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bx.bg};border:${bx.border};border-radius:${d.look.radius}px;${extra}"><tr><td style="padding:${pad}">${inner}</td></tr></table>`

/** The optional gift card: the picture (screen, PDF and hub) or a gift icon, and the words. Email shows the icon and the words, never an uploaded picture. */
function giftCard(d0: Design, s: Sec, t: Target): string {
  const box = boxFor(d0, 'gift', { bg: d0.pal.tint, border: `2px solid ${d0.pal.tint2}` }), d = box.dd
  const img = t === 'web' && d.gift?.dataUrl ? `<img src="${esc(d.gift.dataUrl)}" alt="The gift" width="96" height="96" style="display:block;width:96px;height:96px;border-radius:${Math.min(d.look.radius, 16)}px;object-fit:cover;border:3px solid ${d.pal.tint2}">` : ''
  const lead = img || iconBubble(d, 'gift', t, 52)
  return shell(d0, box, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" width="${img ? 110 : 66}" style="padding-right:14px">${lead}</td><td valign="middle"><h2 style="margin:0 0 4px;font-family:${d.look.headFont};font-size:18px;line-height:1.25;color:${d.pal.dark}">${esc(s.title)}</h2>${paras(s.blocks, 15, d.ink)}</td></tr></table>`)
}
function head(d: Design, s: Sec, t: Target, big = false): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr><td valign="middle" style="padding-right:10px">${iconBubble(d, s.icon, t, big ? 40 : 34)}</td><td valign="middle"><h2 style="margin:0;font-family:${d.look.headFont};font-size:${big ? 21 : 17}px;line-height:1.25;color:${d.pal.dark}">${esc(s.title)}</h2></td></tr></table>`
}
function body(d: Design, s: Sec, big = false): string {
  const stat = statTiles(d, s.blocks)
  if (stat) return stat
  const size = big ? 16 : 15
  if (s.role === 'chips') return chips(d, s.blocks)
  if (s.role === 'quote') return s.blocks.map(b => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr><td width="26" valign="top" style="font-family:Georgia,serif;font-size:34px;line-height:28px;color:${d.pal.accent}">&#8220;</td><td valign="top" style="font-family:${d.look.headFont};font-size:${size}px;line-height:1.5;font-style:italic;color:${d.ink}">${esc(unquote(b.text))}</td></tr></table>`).join('')
  if (s.role === 'dates' && s.blocks.some(b => b.t === 'li')) return paras(s.blocks, size, d.ink) + dateRows(d, s.blocks.filter(b => b.t === 'li'))
  return paras(s.blocks, size, d.ink) + bullets(d, s.blocks, size)
}

function cell(d0: Design, s: Sec, t: Target, kind: Row['kind']): string {
  if (kind === 'custom') return customCell(d0, s, t)
  if (kind === 'hero') {
    const box = boxFor(d0, s.id, cardDefault(d0, true)), d = box.dd
    const person = s.role === 'person' && (d.people.length > 0 || !!d.photo || (d.sample && (s.key === 'who' || s.key === 'story')))
    // When the card's heading just repeats the newsletter's own title, it is shown once (in the banner), not twice.
    const dup = norm(s.title) === norm(d0.title)
    const left = `${dup ? '' : head(d, s, t, true)}${body(d, s, true)}`
    const n = Math.max(1, d.people.length)
    const inner = person
      ? (n >= 3 ? `${left}<div style="padding-top:6px">${photoCluster(d, t)}</div><div style="clear:both"></div>`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">${left}</td><td valign="top" align="right" width="${n === 2 ? 240 : 156}" style="padding-left:14px">${photoCluster(d, t)}</td></tr></table>`)
      : left
    return shell(d0, box, inner)
  }
  if (kind === 'quote') {
    const box = boxFor(d0, s.id, { bg: d0.pal.tint2, border: '0' }), d = box.dd
    const qs = s.blocks.map(b => unquote(b.text)).filter(Boolean)
    return shell(d0, box, `<div style="font-family:${d.look.headFont};font-size:15px;font-weight:700;color:${d.pal.dark};padding-bottom:12px;letter-spacing:.3px">${esc(s.title)}</div>${qs.map(q => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr><td width="34" valign="top" style="font-family:Georgia,serif;font-size:42px;line-height:34px;color:${d.pal.accent}">&#8220;</td><td valign="top" style="font-family:${d.look.headFont};font-size:17px;line-height:1.5;font-style:italic;color:${d.ink}">${esc(q)}</td></tr></table>`).join('')}`, '20px 22px')
  }
  if (kind === 'cta') {
    const box = boxFor(d0, s.id, cardDefault(d0, true)), d = box.dd
    const href = /holiday|book|time off/i.test(s.title) ? d0.links.holiday : null
    const label = /nominate/i.test(s.title) ? 'How to nominate' : /book/i.test(s.title) ? 'Book your holiday' : s.title
    const onAccent = d === d0 ? WHITE : d0.pal.accent
    const btn = href
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px"><tr><td style="background:${d0.pal.accent === d.pal.accent ? d.pal.accent : WHITE};border-radius:${Math.min(d.look.radius, 12)}px"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:700;color:${onAccent};text-decoration:none">${esc(label)}</a></td></tr></table>`
      : `<div style="margin-top:6px"><span style="display:inline-block;padding:7px 16px;background:#FFFFFF;border:2px solid ${d0.pal.accent};border-radius:${Math.min(d.look.radius, 12)}px;font-size:14px;font-weight:700;color:${d0.pal.dark}">${esc(label)}</span></div>`   // a label, not a button: it goes nowhere
    return shell(d0, box, `${head(d, s, t, true)}${body(d, s, true)}${btn}`)
  }
  if (kind === 'footer') {
    const box = boxFor(d0, s.id, { bg: d0.pal.tint, border: `1px solid ${d0.pal.tint2}` }), d = box.dd
    return shell(d0, box, `${head(d, s, t)}${body(d, s)}`, '16px 20px')
  }
  const box = boxFor(d0, s.id, cardDefault(d0, s.role === 'thanks')), d = box.dd
  return shell(d0, box, `${head(d, s, t)}${body(d, s)}`)
}

// ── blocks the tenant adds ──────────────────────────────────────────────────────────────
const paraBlocks = (text: unknown): Block[] => String(text ?? '').split(/\n{2,}/).map(x => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean).map(text => ({ t: 'p' as const, text }))
const safeHttps = (u: unknown): string | null => { const x = String(u ?? '').trim(); return /^https:\/\/[^\s"'<>]+$/i.test(x) && x.length <= 300 ? x : null }
function listHtml(d: Design, items: string[], ticks: boolean): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items.map(t => `<tr><td width="20" valign="top" style="padding:3px 0;color:${d.pal.accent};font-size:15px;line-height:1.5;font-weight:700">${ticks ? '&#10003;' : '&#8226;'}</td><td valign="top" style="padding:3px 0;font-size:15px;line-height:1.5;color:${d.ink}">${esc(t)}</td></tr>`).join('')}</table>`
}
function datesHtml(d: Design, rows: Array<{ date: string; what: string }>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.map(r => `<tr><td valign="top" width="38%" style="padding:5px 10px 5px 0;font-size:14px;font-weight:700;color:${d.pal.dark};border-bottom:1px solid ${LINE}">${esc(r.date)}</td><td valign="top" style="padding:5px 0;font-size:14px;color:${d.ink};border-bottom:1px solid ${LINE}">${esc(r.what)}</td></tr>`).join('')}</table>`
}
function customCell(d0: Design, s: Sec, t: Target): string {
  const c = s.custom!, x = c.content ?? {}
  const dflt: Box = c.type === 'quote' ? { bg: d0.pal.tint2, border: '0' } : c.type === 'callout' ? { bg: d0.pal.tint, border: `2px solid ${d0.pal.tint2}` } : c.type === 'button' ? { bg: WHITE, border: '0' } : cardDefault(d0, false)
  const box = boxFor(d0, s.id, dflt), d = box.dd
  const title = s.title ? `<h2 style="margin:0 0 8px;font-family:${d.look.headFont};font-size:17px;line-height:1.25;color:${d.pal.dark}">${esc(s.title)}</h2>` : ''
  const img = d0.customImages[s.id]
  switch (c.type) {
    case 'text': return shell(d0, box, `${title}${paras(paraBlocks(x.text), 15, d.ink)}`)
    case 'picture_text': {
      const text = `${title}${paras(paraBlocks(x.text), 15, d.ink)}`
      if (t !== 'web' || !img?.dataUrl) return shell(d0, box, `${text}<div style="font-size:12px;line-height:1.4;color:${d.muted}">The picture is in the hub and the PDF.</div>`)
      const pic = `<td class="nl-col" valign="top" width="190" style="width:190px;padding:${x.side === 'right' ? '0 0 0 14px' : '0 14px 0 0'}"><img src="${esc(img.dataUrl)}" alt="${esc(x.alt)}" width="190" style="display:block;width:100%;max-width:190px;height:auto;border-radius:${Math.min(d.look.radius, 14)}px;border:0"></td>`
      const txt = `<td class="nl-col" valign="top">${text}</td>`
      return shell(d0, box, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${x.side === 'right' ? txt + pic : pic + txt}</tr></table>`)
    }
    case 'quote': return shell(d0, box, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="34" valign="top" style="font-family:Georgia,serif;font-size:42px;line-height:34px;color:${d.pal.accent}">&#8220;</td><td valign="top" style="font-family:${d.look.headFont};font-size:17px;line-height:1.5;font-style:italic;color:${d.ink}">${esc(unquote(String(x.text ?? '')))}${x.who ? `<div style="font-family:${SANS};font-style:normal;font-size:13px;color:${d.muted};padding-top:6px">${esc(x.who)}</div>` : ''}</td></tr></table>`, '20px 22px')
    case 'callout': return shell(d0, box, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" width="58" style="padding-right:12px">${iconBubble(d, s.icon, t, 46)}</td><td valign="top">${title}${paras(paraBlocks(x.text), 15, d.ink)}</td></tr></table>`)
    case 'button': {
      const href = x.kind === 'hub' ? safeHttps(d0.links.hub) : safeHttps(x.url)
      const label = esc(x.label)
      const onAccent = d === d0 ? WHITE : d0.pal.accent, fill = d === d0 ? d0.pal.accent : WHITE
      return shell(d0, box, href
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${fill};border-radius:${Math.min(d.look.radius, 12)}px"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:700;color:${onAccent};text-decoration:none">${label}</a></td></tr></table>`
        : `<span style="display:inline-block;padding:7px 16px;background:#FFFFFF;border:2px solid ${d0.pal.accent};border-radius:${Math.min(d.look.radius, 12)}px;font-size:14px;font-weight:700;color:${d0.pal.dark}">${label}</span>`, '8px 4px')
    }
    case 'numbers': return shell(d0, box, `${title}${tilesHtml(d, (Array.isArray(x.items) ? x.items : []).slice(0, 4))}`)
    case 'list': return shell(d0, box, `${title}${listHtml(d, (Array.isArray(x.items) ? x.items : []).map(String), x.style === 'ticks')}`)
    case 'dates': return shell(d0, box, `${title}${datesHtml(d, Array.isArray(x.rows) ? x.rows : [])}`)
  }
  return ''
}

function rowHtml(d: Design, r: Row, t: Target): string {
  if (r.kind === 'gift') return giftCard(d, r.cells[0], t)
  if (r.kind === 'pair') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${r.cells.map((c, i) => { const n = r.cells.length, pct = Math.floor(100 / n), pad = n === 1 ? '0' : i === 0 ? '0 6px 0 0' : i === n - 1 ? '0 0 0 6px' : '0 6px'; return `<td class="nl-col" width="${pct}%" valign="top" style="width:${pct}%;padding:${pad}">${(r.cellKinds?.[i] ?? 'full') === 'gift' ? giftCard(d, c, t) : cell(d, c, t, r.cellKinds?.[i] ?? 'full')}</td>` }).join('')}</tr></table>`
  }
  return cell(d, r.cells[0], t, r.kind)
}

/** The designed newsletter as email safe HTML (target "email": glyph icons, initials instead of a photo, a logo address) or for the screen (target "web": inline line icons, the photo if chosen). */
/** `sheet`: the page itself (a full width card with no grey surround), for the A4 sheet that screen, Print and Save PDF all share. */
export function renderNewsletterHtml(input: DesignInput, target: Target = 'web', opts: { sheet?: boolean } = {}): string {
  const d = buildDesign(input)
  const stripe = d.pal.accent2
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent}" width="50%">&nbsp;</td><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent2}" width="30%">&nbsp;</td><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.tint2}" width="20%">&nbsp;</td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent}">&nbsp;</td></tr></table>`
  const logo = d.brand.logo ? `<img src="${esc(d.brand.logo)}" alt="${esc(d.brand.name)} logo" height="44" style="display:block;height:44px;width:auto;max-width:180px;border:0">` : ''
  const mast = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${d.orientation === 'landscape' ? '10px 24px 8px' : '18px 24px 14px'}" valign="middle">${logo || `<span style="font-size:18px;font-weight:700;color:${d.pal.dark}">${esc(d.brand.name)}</span>`}</td><td align="right" valign="middle" style="padding:${d.orientation === 'landscape' ? '10px 24px 8px' : '18px 24px 14px'};font-size:13px;color:${MUTED}">${logo ? `<span style="font-weight:700;color:${INK}">${esc(d.brand.name)}</span><br>` : ''}Staff newsletter</td></tr></table>`
  const sampleTag = d.sample ? `<span style="display:inline-block;margin-left:8px;padding:3px 10px;border:1px dashed ${d.pal.accent};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.8px;color:${d.pal.dark};background:#FFFFFF">SAMPLE</span>` : ''
  const intro = d.intro.length ? `<tr><td style="padding:0 24px 14px;font-size:16px;line-height:1.6;color:${INK}">${paras(d.intro, 16)}</td></tr>` : ''
  const banner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${d.pal.tint2}"><tr><td style="padding:${d.orientation === 'landscape' ? '12px 24px' : '22px 24px'}"><span style="display:inline-block;padding:4px 12px;background:#FFFFFF;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${d.pal.dark}">${esc(d.kicker)}</span>${sampleTag}<h1 style="margin:${d.orientation === 'landscape' ? '6px 0 2px' : '12px 0 4px'};font-family:${d.look.headFont};font-size:${d.orientation === 'landscape' ? 24 : 28}px;line-height:1.2;color:${d.pal.dark}">${esc(d.title)}</h1><div style="font-size:14px;color:${MUTED}">${esc(d.month)}</div></td></tr></table>`
  const rows = d.rows.map(r => `<tr><td style="padding:0 24px 14px">${rowHtml(d, r, target)}</td></tr>`).join('')
  const contact = (d.brand.contact ?? []).filter(Boolean).slice(0, 3).map(esc).join('<br>')
  const foot = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE}"><tr><td style="padding:${d.orientation === 'landscape' ? '8px 24px 10px' : '16px 24px 20px'};font-size:13px;line-height:1.6;color:${MUTED}"><strong style="color:${INK}">${esc(d.brand.name)}</strong>${d.orientation === 'landscape' ? ` &nbsp;|&nbsp; ${[(d.brand.contact ?? []).filter(Boolean).slice(0, 3).map(esc).join(' &nbsp;|&nbsp; '), d.sentBy ? `Sent by ${esc(d.sentBy)}` : '', `For the staff of ${esc(d.brand.name)} only`].filter(Boolean).join(' &nbsp;|&nbsp; ')}` : `${contact ? `<br>${contact}` : ''}${d.sentBy ? `<br>Sent by ${esc(d.sentBy)}` : ''}<br>For the staff of ${esc(d.brand.name)} only.`}</td></tr></table>`
  const css = opts.sheet ? '' : `<style>.nl-wrap h1,.nl-wrap h2{font-weight:700}@media only screen and (max-width:540px){.nl-wrap .nl-col{display:block!important;width:100%!important;padding:0 0 12px 0!important}}</style>`
  if (opts.sheet) return `<div class="nl-card" style="background:#FFFFFF;font-family:${SANS}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF"><tr><td>${stripe}${mast}${banner}</td></tr><tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>${intro}${rows}<tr><td>${foot}</td></tr></table></div>`
  return `${css}<div class="nl-wrap" style="background:${PAGE};padding:14px 8px;font-family:${SANS}"><table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid ${LINE};border-radius:${Math.min(d.look.radius, 18)}px;overflow:hidden"><tr><td>${stripe}${mast}${banner}</td></tr><tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>${intro}${rows}<tr><td>${foot}</td></tr></table></div>`
}

/** What the HTML says as plain text, for tests and a text part. */
export const htmlToText = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()

// ── PDF: the same design model drawn with pdfkit ───────────────────────────────────────
/** The same steps as the sheet's fit step (newsletter-sheet.ts FIT_STEPS). */
const FIT_STEPS_PDF = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8]
const pdfSafe = (s: string) => String(s ?? '').normalize('NFC').replace(/[‘’]/g, '’').replace(/[^\u0009\u000A -~ -ÿ’“”…•€]/g, '')
async function drawNewsletterPdf(input: DesignInput, logoPng: Buffer | null | undefined, photoPngs: Buffer | null | undefined | Array<Buffer | null>, giftPng: Buffer | null | undefined, scale: number): Promise<{ buffer: Buffer; pages: number }> {
  const { default: PDFDocument } = await import('pdfkit')
  const d0 = buildDesign(input)
  let d = d0   // swapped for a bold block while it is drawn, so its words come out white on the accent
  const photos: Array<Buffer | null> = Array.isArray(photoPngs) ? photoPngs : photoPngs ? [photoPngs] : []
  const photoPng = photos[0] ?? null
  const multi = d.people.length > 2, twin = d.people.length === 2   // three or more: a row of pictures along the bottom of the card; two: beside the words, as on the screen
  // The page is A4. The whole drawing is made at `scale` (the fit step: 1, then smaller in small steps) by drawing on a virtual page that is 1/scale bigger, so the design is exactly the same, just smaller.
  const landscape = d0.orientation === 'landscape'
  const W = (landscape ? 841.89 : 595.28) / scale, H = (landscape ? 595.28 : 841.89) / scale, M = 36, CW = W - M * 2, G = 10
  const doc = new PDFDocument({ size: 'A4', layout: landscape ? 'landscape' : 'portrait', margin: M, bufferPages: true, info: { Title: pdfSafe(d.title), Author: pdfSafe(d.brand.name) } })
  const setPage = () => { if (scale !== 1) doc.scale(scale); doc.page.margins.bottom = -1e6 }   // pdfkit must never start a page of its own: every page break below is decided by the design
  setPage()
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const BOTTOM = H - M - 34
  let y = M
  const newPage = () => { doc.addPage(); setPage(); y = M }
  const icon = (name: IconName, x: number, yy: number, size: number, color: string) => {
    doc.save(); doc.translate(x, yy).scale(size / 24); doc.lineWidth(1.8).lineCap('round').lineJoin('round').strokeColor(color)
    for (const o of ICONS[name]) { if ('d' in o) doc.path(o.d).stroke(); else doc.circle(o.c[0], o.c[1], o.c[2]).stroke() }
    doc.restore()
  }
  const bubble = (name: IconName, x: number, yy: number, size: number) => {
    doc.save(); doc.fillColor(d.pal.tint2)
    if (d.look.iconShape === 'circle') doc.circle(x + size / 2, yy + size / 2, size / 2).fill(); else doc.roundedRect(x, yy, size, size, 6).fill()
    doc.restore(); icon(name, x + size * 0.22, yy + size * 0.22, size * 0.56, d.pal.accent)
  }
  const styleOf = (id: string) => d0.styles[id]
  type PBox = { bg: string; stroke?: string; left?: string }
  const boxPdf = (id: string, dflt: PBox): PBox => { const st = styleOf(id); if (st === 'bold') return { bg: d0.pal.accent, stroke: d0.pal.accent }; if (st === 'outline') return { bg: '#FFFFFF', stroke: d0.pal.accent }; if (st === 'none') return { bg: '#FFFFFF' }; if (st === 'soft') return { bg: d0.pal.tint, stroke: d0.pal.tint2 }; return dflt }
  const tonedFor = (id: string) => (styleOf(id) === 'bold' ? boldDesign(d0) : d0)
  const textH = (text: string, w: number, size: number, font = 'Helvetica', gap = 2.5) => { doc.font(font).fontSize(size); return doc.heightOfString(pdfSafe(text), { width: w, lineGap: gap }) }
  const bodyH = (s: Sec, w: number, size: number) => {
    let h = 0
    for (const b of s.blocks) h += s.role === 'quote' ? textH(unquote(b.text), w - 18, size, 'Helvetica-Oblique') + 6 : b.t === 'p' ? textH(b.text, w, size) + 6 : textH(b.text, w - 16, size) + 4
    return h
  }
  const drawBody = (s: Sec, x: number, yy: number, w: number, size: number) => {
    let cy = yy
    for (const b of s.blocks) {
      if (s.role === 'quote') { const q = unquote(b.text); doc.fillColor(d.pal.accent).font('Times-Bold').fontSize(size + 8).text('\u201C', x, cy - 4, { width: 14, lineBreak: false }); doc.fillColor(d.ink).font('Helvetica-Oblique').fontSize(size).text(pdfSafe(q), x + 18, cy, { width: w - 18, lineGap: 2.5 }); cy += textH(q, w - 18, size, 'Helvetica-Oblique') + 6; continue }
      if (b.t === 'p') { doc.fillColor(d.ink).font('Helvetica').fontSize(size).text(pdfSafe(b.text), x, cy, { width: w, lineGap: 2.5 }); cy += textH(b.text, w, size) + 6 }
      else { icon('check', x, cy - 0.5, size + 1, d.pal.accent); doc.fillColor(d.ink).font('Helvetica').fontSize(size).text(pdfSafe(b.text), x + 16, cy, { width: w - 16, lineGap: 2.5 }); cy += textH(b.text, w - 16, size) + 4 }
    }
    return cy
  }
  const fillBox = (x: number, yy: number, w: number, h: number, bg: string, stroke?: string, left?: string) => {
    doc.save(); doc.roundedRect(x, yy, w, h, Math.min(d.look.radius, 12)).fillColor(bg).fill()
    if (stroke) doc.roundedRect(x, yy, w, h, Math.min(d.look.radius, 12)).lineWidth(d.look.cardStyle === 'outline' ? 1.6 : 0.8).strokeColor(stroke).stroke()
    if (left) doc.rect(x, yy + 4, 3.5, h - 8).fillColor(left).fill()
    doc.restore()
  }
  // masthead and banner
  doc.rect(0, 0, W, 6).fillColor(d.pal.accent).fill()
  if (d.pal.accent2) { doc.rect(W * 0.5, 0, W * 0.3, 6).fillColor(d.pal.accent2).fill() }
  y = 22
  if (logoPng) { try { doc.image(logoPng, M, y, { fit: [140, 40] }) } catch { /* no logo */ } }
  else doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(15).text(pdfSafe(d.brand.name), M, y + 8, { width: CW * 0.6 })
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(pdfSafe(logoPng ? `${d.brand.name}\nStaff newsletter` : 'Staff newsletter'), M, y + 4, { width: CW, align: 'right' })
  y += 52
  const titleH = textH(d.title, CW - 20, 24, 'Helvetica-Bold', 1)
  const bh = 22 + 12 + titleH + 22
  doc.save(); doc.rect(M - 6, y, CW + 12, bh).fillColor(d.pal.tint2).fill(); doc.restore()
  doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(8).text(pdfSafe(d.kicker.toUpperCase() + (d.sample ? '   SAMPLE' : '')), M + 10, y + 12, { width: CW - 20, characterSpacing: 0.8 })
  doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(24).text(pdfSafe(d.title), M + 10, y + 26, { width: CW - 20, lineGap: 1 })
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(pdfSafe(d.month), M + 10, y + 26 + titleH + 4, { width: CW - 20 })
  y += bh + 14
  if (d.intro.length) { const t = d.intro.map(b => b.text).join(' '); doc.fillColor(INK).font('Helvetica').fontSize(11.5).text(pdfSafe(t), M, y, { width: CW, lineGap: 3 }); y += textH(t, CW, 11.5, 'Helvetica', 3) + 12 }

  const cardInner = (s: Sec, w: number, big: boolean) => ({ size: big ? 11.5 : 10.5, hw: w - 28, titleSize: big ? 14 : 12.5 })
  const dupHero = (s: Sec, big: boolean) => big && norm(s.title) === norm(d0.title)   // the heading just repeats the newsletter's title: shown once, in the banner
  const textWidth = (c: { hw: number }, withPhoto: boolean) => (withPhoto ? (multi ? c.hw : twin ? c.hw - 196 : c.hw - 120) : c.hw)
  const cardHeight = (s: Sec, w: number, big: boolean, withPhoto = false) => {
    const c = cardInner(s, w, big); const textW = textWidth(c, withPhoto)
    const h = (dupHero(s, big) ? 14 + 2 : 14 + Math.max(34, 4)) + 6 + bodyH(s, textW, c.size) + 8
    return withPhoto ? (multi ? h + 104 : Math.max(h, twin ? 160 : 150)) : h   // room for the round picture, or a row of them
  }
  const drawCard = (s: Sec, x: number, yy: number, w: number, h: number, big: boolean, tinted: boolean, withPhoto = false) => {
    const bx = boxPdf(s.id, { bg: tinted || d0.look.cardStyle === 'soft' ? d0.pal.tint : '#FFFFFF', stroke: d0.look.cardStyle === 'outline' ? d0.pal.tint2 : LINE, left: d0.look.cardStyle === 'rule' ? d0.pal.accent : undefined })
    fillBox(x, yy, w, h, bx.bg, bx.stroke, bx.left)
    const c = cardInner(s, w, big); const px = x + 14
    const dup = dupHero(s, big), bodyY = dup ? yy + 16 : yy + 50
    if (!dup) bubble(s.icon, px, yy + 12, 28)
    if (!dup) doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(c.titleSize).text(pdfSafe(s.title), px + 38, yy + 12 + (28 - c.titleSize) / 2 - 1, { width: c.hw - 38 - (withPhoto ? (twin ? 188 : multi ? 0 : 112) : 0), lineBreak: false, ellipsis: true })
    const stat = statValues(s)
    if (stat) {
      const cw = (c.hw - (stat.length - 1) * 6) / stat.length
      stat.forEach((st, i) => { const sx = px + i * (cw + 6); doc.save(); doc.roundedRect(sx, yy + 50, cw, 52, 8).fillColor(d.pal.tint).fill(); doc.restore(); doc.fillColor(d.pal.accent).font('Helvetica-Bold').fontSize(22).text(st.n, sx, yy + 56, { width: cw, align: 'center' }); doc.fillColor(d.muted).font('Helvetica').fontSize(8.5).text(pdfSafe(st.label), sx + 4, yy + 84, { width: cw - 8, align: 'center' }) })
    } else drawBody(s, px, bodyY, textWidth(c, withPhoto), c.size)
    if (withPhoto && (multi || twin)) {
      // three or more featured people: a row of round pictures (or initials) with first names along the bottom of the card, wrapping if there are many; two: side by side at the right, beside the words
      const D = twin ? 78 : d.people.length <= 4 ? 64 : 52, gap = twin ? 14 : 18, per = twin ? 2 : Math.max(1, Math.floor((c.hw + gap) / (D + gap)))
      const baseX = twin ? x + w - 14 - (2 * D + gap) : px, baseY = twin ? yy + (dup ? 16 : 46) : yy + h - 96
      d.people.forEach((pp, i) => {
        const col = i % per, row = Math.floor(i / per), cx = baseX + col * (D + gap), cy = baseY + row * (D + 24)
        const buf = photos[i]
        if (buf && buf.length) { try { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).clip(); doc.image(buf, cx, cy, { cover: [D, D], align: 'center', valign: 'center' }); doc.restore() } catch { /* no photo */ } doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).lineWidth(2).strokeColor(d.pal.tint2).stroke(); doc.restore() }
        else if (d.sample && !pp.name) { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore() }
        else { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore(); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(18).text(initials(pp.name ?? '') || '*', cx, cy + D / 2 - 10, { width: D, align: 'center', lineBreak: false }) }
        doc.fillColor(d.ink).font('Helvetica').fontSize(8.5).text(pdfSafe(String(pp.name ?? '').split(' ')[0]), cx - 6, cy + D + 3, { width: D + 12, align: 'center', lineBreak: false, ellipsis: true })
      })
    }
    if (withPhoto && !multi && !twin) {
      const D = 84, cx = x + w - 14 - D, cy = yy + (dup ? 16 : 50)
      if (photoPng) { try { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).clip(); doc.image(photoPng, cx, cy, { cover: [D, D], align: 'center', valign: 'center' }); doc.restore() } catch { /* no photo */ } doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).lineWidth(2).strokeColor(d.pal.tint2).stroke(); doc.restore() }
      else if (d.sample && !d.photo) {
        doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore()
        doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).clip(); doc.fillColor(d.pal.accent).opacity(0.55); doc.circle(cx + D / 2, cy + D * 0.38, D * 0.17).fill(); doc.moveTo(cx + D * 0.16, cy + D).bezierCurveTo(cx + D * 0.18, cy + D * 0.72, cx + D * 0.33, cy + D * 0.62, cx + D / 2, cy + D * 0.62).bezierCurveTo(cx + D * 0.67, cy + D * 0.62, cx + D * 0.82, cy + D * 0.72, cx + D * 0.84, cy + D).fill(); doc.restore()
      }
      else { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore(); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(24).text(initials(d.photo?.name ?? '') || '*', cx, cy + D / 2 - 14, { width: D, align: 'center' }) }
    }
  }
  function statValues(s: Sec): Array<{ n: string; label: string }> | null {
    if (s.custom?.type === 'numbers') { const it = Array.isArray(s.custom.content?.items) ? s.custom.content.items : []; return it.length >= 2 ? it.slice(0, 4).map((r: any) => ({ n: String(r.n), label: String(r.label) })) : null }
    const li = s.blocks.filter(b => b.t === 'li'); const m = li.map(b => /^(\d{1,4})\s+(.{2,60})$/.exec(b.text)).filter(Boolean) as RegExpExecArray[]
    return m.length >= 2 && m.length === li.length && m.length <= 4 ? m.map(x => ({ n: x[1], label: x[2] })) : null
  }
  /** One block the tenant added: the same design as on screen, drawn with the page's own measures. */
  const drawCustom = (s: Sec) => {
    const c = s.custom!, x = c.content ?? {}
    const bx = boxPdf(s.id, c.type === 'quote' ? { bg: d0.pal.tint2 } : c.type === 'callout' ? { bg: d0.pal.tint, stroke: d0.pal.tint2 } : c.type === 'button' ? { bg: '#FFFFFF' } : { bg: d0.look.cardStyle === 'soft' ? d0.pal.tint : '#FFFFFF', stroke: LINE })
    const pad = 14, iw = CW - pad * 2
    const para = (v: unknown) => String(v ?? '').split(/\n{2,}/).map(t => t.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
    const titleH = s.title ? 24 : 0
    const drawTitle = (yy: number, xx = M + pad, w = iw) => { if (s.title) doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(12.5).text(pdfSafe(s.title), xx, yy, { width: w, lineBreak: false, ellipsis: true }) }
    const paras = (list: string[], xx: number, yy: number, w: number, size = 11) => { let cy = yy; for (const t of list) { doc.fillColor(d.ink).font('Helvetica').fontSize(size).text(pdfSafe(t), xx, cy, { width: w, lineGap: 2.5 }); cy += textH(t, w, size) + 6 } return cy }
    const parasH = (list: string[], w: number, size = 11) => list.reduce((a, t) => a + textH(t, w, size) + 6, 0)
    const items: string[] = c.type === 'list' ? (Array.isArray(x.items) ? x.items.map(String) : []) : []
    const rowsD: Array<{ date: string; what: string }> = c.type === 'dates' ? (Array.isArray(x.rows) ? x.rows : []) : []
    const img = d0.customImages[s.id]?.buffer ?? null
    const picW = 150
    let h = 0
    if (c.type === 'text') h = pad + titleH + parasH(para(x.text), iw) + 8
    else if (c.type === 'picture_text') h = pad + titleH + Math.max(parasH(para(x.text), iw - (img ? picW + 14 : 0)), img ? 110 : 0) + 8
    else if (c.type === 'quote') h = 20 + textH(unquote(String(x.text ?? '')), iw - 34, 13, 'Helvetica-Oblique') + (x.who ? 18 : 0) + 16
    else if (c.type === 'callout') h = pad + Math.max(40, titleH + parasH(para(x.text), iw - 52)) + 8
    else if (c.type === 'button') h = 44
    else if (c.type === 'numbers') h = pad + titleH + 56 + 10
    else if (c.type === 'list') h = pad + titleH + items.reduce((a, t) => a + textH(t, iw - 16, 11) + 4, 0) + 8
    else h = pad + titleH + rowsD.reduce((a, r) => a + Math.max(textH(r.date, iw * 0.38 - 8, 10.5), textH(r.what, iw * 0.62, 10.5)) + 7, 0) + 8
    need(h + G)
    d = tonedFor(s.id)
    if (c.type !== 'button' || styleOf(s.id)) fillBox(M, y, CW, h, bx.bg, bx.stroke, bx.left)
    const x0 = M + pad
    if (c.type === 'text') { drawTitle(y + pad - 2); paras(para(x.text), x0, y + pad + titleH - 4, iw) }
    else if (c.type === 'picture_text') {
      const left = x.side !== 'right', tw = iw - (img ? picW + 14 : 0), tx = img && left ? x0 + picW + 14 : x0
      drawTitle(y + pad - 2, tx, tw); paras(para(x.text), tx, y + pad + titleH - 4, tw)
      if (img) { try { doc.save(); doc.roundedRect(left ? x0 : x0 + tw + 14, y + pad, picW, 110, 8).clip(); doc.image(img, left ? x0 : x0 + tw + 14, y + pad, { cover: [picW, 110], align: 'center', valign: 'center' }); doc.restore() } catch { /* no picture */ } }
    } else if (c.type === 'quote') {
      doc.fillColor(d.pal.accent).font('Times-Bold').fontSize(34).text('\u201C', x0, y + 12, { width: 26, lineBreak: false })
      const q = unquote(String(x.text ?? '')); doc.fillColor(d.ink).font('Helvetica-Oblique').fontSize(13).text(pdfSafe(q), x0 + 34, y + 18, { width: iw - 34, lineGap: 2.5 })
      if (x.who) doc.fillColor(d.muted).font('Helvetica').fontSize(10).text(pdfSafe(String(x.who)), x0 + 34, y + 18 + textH(q, iw - 34, 13, 'Helvetica-Oblique') + 4, { width: iw - 34, lineBreak: false })
    } else if (c.type === 'callout') {
      bubble(s.icon, x0, y + pad, 36); drawTitle(y + pad - 1, x0 + 48, iw - 48); paras(para(x.text), x0 + 48, y + pad + titleH - 3, iw - 48)
    } else if (c.type === 'button') {
      const label = pdfSafe(String(x.label ?? '')), href = x.kind === 'hub' ? d0.links.hub : /^https:\/\/\S+$/i.test(String(x.url ?? '')) ? String(x.url) : null
      const bw = Math.min(CW, doc.font('Helvetica-Bold').fontSize(12).widthOfString(label) + 40)
      doc.save(); doc.roundedRect(M + 4, y + 8, bw, 28, 8)
      if (href) doc.fillColor(d === d0 ? d0.pal.accent : '#FFFFFF').fill(); else doc.fillColor('#FFFFFF').fill().roundedRect(M + 4, y + 8, bw, 28, 8).lineWidth(1.6).strokeColor(d0.pal.accent).stroke()
      doc.restore()
      doc.fillColor(href ? (d === d0 ? '#FFFFFF' : d0.pal.accent) : d0.pal.dark).font('Helvetica-Bold').fontSize(12).text(label, M + 4, y + 16, { width: bw, align: 'center', lineBreak: false })
      if (href) { try { doc.link(M + 4, y + 8, bw, 28, href) } catch { /* no link */ } }
    } else if (c.type === 'numbers') {
      drawTitle(y + pad - 2); const st = statValues(s) ?? [], cw = (iw - (st.length - 1) * 6) / Math.max(1, st.length), ty = y + pad + titleH
      st.forEach((t, i) => { const sx = x0 + i * (cw + 6); doc.save(); doc.roundedRect(sx, ty, cw, 52, 8).fillColor(d.pal.tint2 === d.pal.tint ? d.pal.tint : (styleOf(s.id) === 'bold' ? d.pal.tint2 : d.pal.tint)).fill(); doc.restore(); doc.fillColor(d.pal.accent).font('Helvetica-Bold').fontSize(22).text(pdfSafe(t.n), sx, ty + 6, { width: cw, align: 'center', lineBreak: false }); doc.fillColor(d.muted).font('Helvetica').fontSize(8.5).text(pdfSafe(t.label), sx + 4, ty + 34, { width: cw - 8, align: 'center', lineBreak: false, ellipsis: true }) })
    } else if (c.type === 'list') {
      drawTitle(y + pad - 2); let cy = y + pad + titleH - 2
      for (const t of items) { if (x.style === 'ticks') icon('check', x0, cy - 0.5, 12, d.pal.accent); else { doc.save(); doc.circle(x0 + 4, cy + 5.5, 2.2).fillColor(d.pal.accent).fill(); doc.restore() } doc.fillColor(d.ink).font('Helvetica').fontSize(11).text(pdfSafe(t), x0 + 16, cy, { width: iw - 16, lineGap: 2.5 }); cy += textH(t, iw - 16, 11) + 4 }
    } else {
      drawTitle(y + pad - 2); let cy = y + pad + titleH - 2
      for (const r of rowsD) { const rh = Math.max(textH(r.date, iw * 0.38 - 8, 10.5), textH(r.what, iw * 0.62, 10.5)); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(10.5).text(pdfSafe(r.date), x0, cy, { width: iw * 0.38 - 8 }); doc.fillColor(d.ink).font('Helvetica').fontSize(10.5).text(pdfSafe(r.what), x0 + iw * 0.38, cy, { width: iw * 0.62 }); cy += rh + 3; doc.moveTo(x0, cy).lineTo(x0 + iw, cy).lineWidth(0.5).strokeColor(LINE).stroke(); cy += 4 }
    }
    y += h + G
  }
  const personHero = (s: Sec) => s.role === 'person' && (d.people.length > 0 || !!d.photo || (d.sample && (s.key === 'who' || s.key === 'story')))
  const need = (h: number) => { if (y + h > BOTTOM) newPage() }
  for (const r of d0.rows) {
    d = tonedFor(r.cells[0]?.id ?? '')
    if (r.kind === 'pair') {
      const nn = r.cells.length, w = (CW - G * (nn - 1)) / nn
      const h = Math.max(...r.cells.map(c => (statValues(c) ? 112 : cardHeight(c, w, false))))
      need(h + G); r.cells.forEach((c, i) => { d = tonedFor(c.id); drawCard(c, M + i * (w + G), y, w, h, false, c.role === 'thanks') }); y += h + G
    } else if (r.kind === 'custom') {
      drawCustom(r.cells[0])
    } else if (r.kind === 'quote') {
      const s = r.cells[0], qs = s.blocks.map(b => unquote(b.text)).filter(Boolean)
      const h = 34 + qs.reduce((a, q) => a + textH(q, CW - 76, 12.5, 'Helvetica-Oblique') + 10, 0) + 10
      { const bq = boxPdf(s.id, { bg: d0.pal.tint2 }); need(h + G); fillBox(M, y, CW, h, bq.bg, bq.stroke) }
      doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(12).text(pdfSafe(s.title), M + 18, y + 14, { width: CW - 36, lineBreak: false })
      let qy = y + 36
      for (const q of qs) { doc.fillColor(d.pal.accent).font('Times-Bold').fontSize(34).text('“', M + 18, qy - 8, { width: 26, lineBreak: false }); doc.fillColor(d.ink).font('Helvetica-Oblique').fontSize(12.5).text(pdfSafe(q), M + 52, qy, { width: CW - 76, lineGap: 2.5 }); qy += textH(q, CW - 76, 12.5, 'Helvetica-Oblique') + 10 }
      y += h + G
    } else if (r.kind === 'cta') {
      const s = r.cells[0]; const label = /nominate/i.test(s.title) ? 'How to nominate' : /book/i.test(s.title) ? 'Book your holiday' : s.title
      const h = cardHeight(s, CW, true) + 36
      need(h + G); drawCard(s, M, y, CW, h, true, true)
      const bw = Math.min(CW - 28, doc.font('Helvetica-Bold').fontSize(12).widthOfString(pdfSafe(label)) + 36)
      const linked = !!(/holiday|book|time off/i.test(s.title) && d.links.holiday)
      doc.save(); doc.roundedRect(M + 14, y + h - 40, bw, 28, 8)
      if (linked) doc.fillColor(d === d0 ? d0.pal.accent : '#FFFFFF').fill(); else doc.fillColor('#FFFFFF').fill().roundedRect(M + 14, y + h - 40, bw, 28, 8).lineWidth(1.6).strokeColor(d0.pal.accent).stroke()
      doc.restore()
      doc.fillColor(linked ? (d === d0 ? '#FFFFFF' : d0.pal.accent) : d0.pal.dark).font('Helvetica-Bold').fontSize(12).text(pdfSafe(label), M + 14, y + h - 32, { width: bw, align: 'center', lineBreak: false })
      y += h + G
    } else if (r.kind === 'gift') {
      const s = r.cells[0], txt = s.blocks.map(b => b.text).join(' '), lead = giftPng ? 74 : 62
      const h = Math.max(82, 40 + textH(txt, CW - 28 - lead, 11.5))
      d = tonedFor('gift'); { const bg = boxPdf('gift', { bg: d0.pal.tint, stroke: d0.pal.tint2 }); need(h + G); fillBox(M, y, CW, h, bg.bg, bg.stroke) }
      if (giftPng) { try { doc.save(); doc.roundedRect(M + 14, y + 12, 58, 58, 8).clip(); doc.image(giftPng, M + 14, y + 12, { cover: [58, 58], align: 'center', valign: 'center' }); doc.restore() } catch { bubble('gift', M + 14, y + 14, 44) } } else bubble('gift', M + 14, y + 14, 44)
      doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(14).text(pdfSafe(s.title), M + 14 + lead, y + 14, { width: CW - 28 - lead, lineBreak: false })
      doc.fillColor(d.ink).font('Helvetica').fontSize(11.5).text(pdfSafe(txt), M + 14 + lead, y + 36, { width: CW - 28 - lead, lineGap: 2.5 })
      y += h + G
    } else if (r.kind === 'footer') {
      const s = r.cells[0]; const h = cardHeight(s, CW, false)
      { const bf = boxPdf(s.id, { bg: d0.pal.tint }); need(h + G); fillBox(M, y, CW, h, bf.bg, bf.stroke) }; bubble(s.icon, M + 14, y + 12, 28); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(12.5).text(pdfSafe(s.title), M + 52, y + 19, { width: CW - 70, lineBreak: false }); drawBody(s, M + 14, y + 50, CW - 28, 10.5); y += h + G
    } else {
      const s = r.cells[0], big = r.kind === 'hero', ph = big && personHero(s)
      const h = Math.max(cardHeight(s, CW, big, ph), ph ? 118 : 0, statValues(s) ? 112 : 0)
      need(h + G); drawCard(s, M, y, CW, h, big, big || s.role === 'thanks', ph); y += h + G
    }
    d = d0
  }
  // footer on every page: the organisation line, and "Page 2 of 3" only when there is more than one page. A draft or sample note goes small in the footer, never over the design.
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i); doc.page.margins.bottom = -1e6
    doc.moveTo(M, H - M - 26).lineTo(W - M, H - M - 26).lineWidth(0.6).strokeColor(LINE).stroke()
    const line = [d.brand.name, ...(d.brand.contact ?? []).slice(0, 2), d.sentBy ? `Sent by ${d.sentBy}` : '', 'Staff only'].filter(Boolean).join('   |   ')
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(pdfSafe(line), M, H - M - 20, { width: CW - 70, height: 10, lineBreak: false, ellipsis: true })
    if (range.count > 1) doc.text(`Page ${i + 1} of ${range.count}`, M, H - M - 20, { width: CW, align: 'right', lineBreak: false })
    if (input.stamp) doc.fillColor('#B91C1C').font('Helvetica-Bold').fontSize(7.5).text(pdfSafe(input.stamp), M, H - M - 8, { width: CW, align: 'right', lineBreak: false })
  }
  const pages = range.count
  doc.end()
  return { buffer: await done, pages }
}

/** The pdfkit drawing, fitted to ONE page like the sheet: it tries the same steps (1 down to the minimum) and keeps the first that fits. It is the fallback when the browser engine cannot start, and the design is the same. */
export async function renderNewsletterPdfFit(input: DesignInput, logoPng?: Buffer | null, photoPngs?: Buffer | null | Array<Buffer | null>, giftPng?: Buffer | null, o: { allowTwoPages?: boolean } = {}): Promise<{ buffer: Buffer; pages: number; scale: number; fits: boolean }> {
  const steps = o.allowTwoPages ? [1] : FIT_STEPS_PDF
  let last: { buffer: Buffer; pages: number } | null = null
  for (const sc of steps) {
    last = await drawNewsletterPdf(input, logoPng, photoPngs, giftPng, sc)
    if (last.pages === 1) return { ...last, scale: sc, fits: true }
  }
  return { ...last!, scale: steps[steps.length - 1], fits: !!o.allowTwoPages }
}
export async function renderNewsletterPdf(input: DesignInput, logoPng?: Buffer | null, photoPngs?: Buffer | null | Array<Buffer | null>, giftPng?: Buffer | null): Promise<Buffer> {
  return (await renderNewsletterPdfFit(input, logoPng, photoPngs, giftPng, { allowTwoPages: false })).buffer
}

/** One sample design for every layout of a newsletter type (for the thumbnails). */
export function sampleDesigns(type: string, brand: Brand): Array<{ id: string; layout: string; title: string; html: string }> {
  return NEWSLETTER_TEMPLATES.filter(t => t.type === type).map(t => ({ id: t.id, layout: t.layout, title: t.title, html: renderNewsletterHtml({ templateId: t.id, title: t.type_title, body: sampleBody(t), brand, sentBy: 'Your name', monthText: monthNow(), sample: true }, 'web') }))
}
