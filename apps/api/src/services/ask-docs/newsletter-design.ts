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
  /** Where a button may point (the staff hub); without one the call to action is a plain panel, never a button that goes nowhere. */
  links?: { holiday?: string | null }
  sample?: boolean
  /** Printed at the top of every PDF page when the copy is not final (a draft or a sample). */
  stamp?: string
}
export interface Block { t: 'p' | 'li'; text: string }
export interface Sec { key: string | null; title: string; role: Role; icon: IconName; blocks: Block[]; first?: boolean }
export interface Row { kind: 'hero' | 'full' | 'pair' | 'quote' | 'cta' | 'footer'; cells: Sec[] }
export interface Look { id: string; label: string; accent: string; accent2: string | null; radius: number; headFont: string; cardStyle: 'soft' | 'rule' | 'plain' | 'outline'; iconShape: 'circle' | 'square' }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
const INK = '#1F2937', MUTED = '#4B5563', LINE = '#E5E7EB', PAGE = '#F3F4F6'

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
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n].map(o => 'd' in o ? `<path d="${o.d}"/>` : `<circle cx="${o.c[0]}" cy="${o.c[1]}" r="${o.c[2]}"/>`).join('')}</svg>`

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
  const secs: Sec[] = sections.map((s, i) => {
    const match = tpl ? (tpl.sections.find(t => norm(t.title) === norm(s.title)) ?? (tpl.sections.length === sections.length ? tpl.sections[i] : null)) : null
    const role = roleFor(match ?? null, s.title)
    const allBullets = s.blocks.length > 0 && s.blocks.every(b => b.t === 'li')
    const r: Role = role === 'plain' && allBullets ? 'list' : role
    return { key: match?.key ?? null, title: s.title, role: r, icon: (match && KEY_ICON[match.key]) || ROLE_ICON[r], blocks: s.blocks, first: i === 0 }
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
  intro: Block[]; rows: Row[]; brand: Brand; sentBy: string; photo: DesignInput['photo']; links: NonNullable<DesignInput['links']>; sample: boolean
}
const monthNow = () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/London' })
export function buildDesign(input: DesignInput): Design {
  const tpl = input.templateId ? newsletterTemplate(input.templateId) ?? null : null
  const look = LOOKS[tpl?.category ?? 'whole-team'] ?? LOOKS['whole-team']
  const layout = tpl?.layout ?? 'standard'
  const { intro, secs } = readSections(input.body, tpl)
  const kicker = tpl ? (NEWSLETTER_CATEGORIES.find(c => c.id === tpl.category)?.title ?? look.label) : 'Staff newsletter'
  return { tpl, look, pal: paletteFor(look, input.brand.accent), layout, title: String(input.title || tpl?.type_title || 'Staff newsletter').slice(0, 140), month: input.monthText || monthNow(), kicker, intro, rows: arrange(secs, layout), brand: input.brand, sentBy: input.sentBy ?? '', photo: input.photo ?? null, links: input.links ?? {}, sample: !!input.sample }
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;background:${d.pal.tint2};border-radius:${radius};text-align:center">${inner}</td></tr></table>`
}
function bullets(d: Design, blocks: Block[], size = 15): string {
  const items = blocks.filter(b => b.t === 'li')
  if (!items.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items.map(b => `<tr><td width="20" valign="top" style="padding:3px 0;color:${d.pal.accent};font-size:${size}px;line-height:1.5;font-weight:700">&#10003;</td><td valign="top" style="padding:3px 0;font-size:${size}px;line-height:1.5;color:${INK}">${esc(b.text)}</td></tr>`).join('')}</table>`
}
function paras(blocks: Block[], size = 15, color = INK): string {
  return blocks.filter(b => b.t === 'p').map(b => `<p style="margin:0 0 10px;font-size:${size}px;line-height:1.6;color:${color}">${esc(b.text)}</p>`).join('')
}
function statTiles(d: Design, blocks: Block[]): string | null {
  const items = blocks.filter(b => b.t === 'li').map(b => /^(\d{1,4})\s+(.{2,60})$/.exec(b.text)).filter(Boolean) as RegExpExecArray[]
  if (items.length < 2 || items.length !== blocks.filter(b => b.t === 'li').length || items.length > 4) return null
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${items.map(m => `<td align="center" valign="top" style="padding:4px"><div style="background:${d.pal.tint};border-radius:${Math.min(d.look.radius, 14)}px;padding:12px 6px"><div style="font-size:30px;line-height:1.1;font-weight:700;color:${d.pal.accent};font-family:${d.look.headFont}">${esc(m[1])}</div><div style="font-size:13px;line-height:1.4;color:${MUTED};padding-top:4px">${esc(m[2])}</div></div></td>`).join('')}</tr></table>`
}
function chips(d: Design, blocks: Block[]): string {
  return `<div style="line-height:2.2">${blocks.map(b => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;background:${d.pal.tint};border:1px solid ${d.pal.tint2};border-radius:999px;font-size:14px;color:${INK}">${esc(b.text)}</span>`).join('')}</div>`
}
function dateRows(d: Design, blocks: Block[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${blocks.map(b => {
    const m = /^([^:]{3,28}):\s*(.+)$/.exec(b.text)
    return m ? `<tr><td valign="top" width="38%" style="padding:5px 10px 5px 0;font-size:14px;font-weight:700;color:${d.pal.dark};border-bottom:1px solid ${LINE}">${esc(m[1])}</td><td valign="top" style="padding:5px 0;font-size:14px;color:${INK};border-bottom:1px solid ${LINE}">${esc(m[2])}</td></tr>`
      : `<tr><td colspan="2" style="padding:5px 0;font-size:14px;color:${INK};border-bottom:1px solid ${LINE}">${esc(b.text)}</td></tr>`
  }).join('')}</table>`
}
/** A neutral silhouette for SAMPLE previews: never a real person. */
function silhouette(d: Design, size: number): string {
  const c = d.pal.accent
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Sample picture of a member of staff" style="display:block;border-radius:50%;background:${d.pal.tint2};border:3px solid ${d.pal.tint}"><circle cx="50" cy="38" r="17" fill="${c}" opacity=".55"/><path d="M16 96c2-22 15-34 34-34s32 12 34 34z" fill="${c}" opacity=".55"/></svg>`
}
function photoSlot(d: Design, t: Target, size: number): string {
  const name = d.photo?.name ?? ''
  if (d.sample && t === 'web' && !d.photo?.dataUrl) return silhouette(d, size)
  if (t === 'web' && d.photo?.dataUrl) return `<img src="${esc(d.photo.dataUrl)}" alt="${esc(name ? `Photo of ${name}` : 'Photo')}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:3px solid ${d.pal.tint2}">`
  const ini = initials(name)
  const note = t === 'email' && d.photo?.inHub ? `<div style="font-size:11px;line-height:1.35;color:${MUTED};text-align:center;padding-top:6px;max-width:${size + 20}px">Their photo is in the hub and the PDF</div>` : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;border-radius:50%;background:${d.pal.tint2};border:3px solid ${d.pal.tint};font-size:${Math.round(size / 3)}px;font-weight:700;color:${d.pal.dark};text-align:center" role="img" aria-label="${esc(name ? `Picture slot for ${name}` : 'Picture slot')}">${ini ? esc(ini) : '&#9733;'}</td></tr></table>${note}`
}
function cardShell(d: Design, inner: string, tinted = false, extra = ''): string {
  const r = d.look.radius
  const border = d.look.cardStyle === 'outline' ? `2px solid ${d.pal.tint2}` : d.look.cardStyle === 'rule' ? `1px solid ${LINE};border-left:5px solid ${d.pal.accent}` : `1px solid ${LINE}`
  const bg = tinted || d.look.cardStyle === 'soft' ? d.pal.tint : '#FFFFFF'
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:${border};border-radius:${r}px;${extra}"><tr><td style="padding:16px 18px">${inner}</td></tr></table>`
}
function head(d: Design, s: Sec, t: Target, big = false): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr><td valign="middle" style="padding-right:10px">${iconBubble(d, s.icon, t, big ? 40 : 34)}</td><td valign="middle"><h2 style="margin:0;font-family:${d.look.headFont};font-size:${big ? 21 : 17}px;line-height:1.25;color:${d.pal.dark}">${esc(s.title)}</h2></td></tr></table>`
}
function body(d: Design, s: Sec, big = false): string {
  const stat = statTiles(d, s.blocks)
  if (stat) return stat
  const size = big ? 16 : 15
  if (s.role === 'chips') return chips(d, s.blocks)
  if (s.role === 'quote') return s.blocks.map(b => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr><td width="26" valign="top" style="font-family:Georgia,serif;font-size:34px;line-height:28px;color:${d.pal.accent}">&#8220;</td><td valign="top" style="font-family:${d.look.headFont};font-size:${size}px;line-height:1.5;font-style:italic;color:${INK}">${esc(unquote(b.text))}</td></tr></table>`).join('')
  if (s.role === 'dates' && s.blocks.some(b => b.t === 'li')) return paras(s.blocks, size) + dateRows(d, s.blocks.filter(b => b.t === 'li'))
  return paras(s.blocks, size) + bullets(d, s.blocks, size)
}

function cell(d: Design, s: Sec, t: Target, kind: Row['kind']): string {
  if (kind === 'hero') {
    const person = s.role === 'person' && (!!d.photo || (d.sample && (s.key === 'who' || s.key === 'story')))
    const left = `${head(d, s, t, true)}${body(d, s, true)}`
    const inner = person
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">${left}</td><td valign="top" align="right" width="156" style="padding-left:14px">${photoSlot(d, t, 140)}</td></tr></table>`
      : left
    return cardShell(d, inner, true)
  }
  if (kind === 'quote') {
    const qs = s.blocks.map(b => unquote(b.text)).filter(Boolean)
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${d.pal.tint2};border-radius:${d.look.radius}px"><tr><td style="padding:20px 22px"><div style="font-family:${d.look.headFont};font-size:15px;font-weight:700;color:${d.pal.dark};padding-bottom:12px;letter-spacing:.3px">${esc(s.title)}</div>${qs.map(q => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr><td width="34" valign="top" style="font-family:Georgia,serif;font-size:42px;line-height:34px;color:${d.pal.accent}">&#8220;</td><td valign="top" style="font-family:${d.look.headFont};font-size:17px;line-height:1.5;font-style:italic;color:${INK}">${esc(q)}</td></tr></table>`).join('')}</td></tr></table>`
  }
  if (kind === 'cta') {
    const line = first(s.blocks)
    const href = /holiday|book|time off/i.test(s.title) ? d.links.holiday : null
    const label = /nominate/i.test(s.title) ? 'How to nominate' : /book/i.test(s.title) ? 'Book your holiday' : s.title
    const btn = href
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px"><tr><td style="background:${d.pal.accent};border-radius:${Math.min(d.look.radius, 12)}px"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">${esc(label)}</a></td></tr></table>`
      : `<div style="margin-top:6px"><span style="display:inline-block;padding:7px 16px;background:#FFFFFF;border:2px solid ${d.pal.accent};border-radius:${Math.min(d.look.radius, 12)}px;font-size:14px;font-weight:700;color:${d.pal.dark}">${esc(label)}</span></div>`   // a label, not a button: it goes nowhere
    return cardShell(d, `${head(d, s, t, true)}${line ? '' : ''}${body(d, s, true)}${btn}`, true)
  }
  if (kind === 'footer') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${d.pal.tint};border:1px solid ${d.pal.tint2};border-radius:${d.look.radius}px"><tr><td style="padding:16px 20px">${head(d, s, t)}${body(d, s)}</td></tr></table>`
  }
  return cardShell(d, `${head(d, s, t)}${body(d, s)}`, s.role === 'thanks')
}

function rowHtml(d: Design, r: Row, t: Target): string {
  if (r.kind === 'pair') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${r.cells.map((c, i) => `<td class="nl-col" width="50%" valign="top" style="width:50%;padding:${i === 0 ? '0 6px 0 0' : '0 0 0 6px'}">${cell(d, c, t, 'full')}</td>`).join('')}</tr></table>`
  }
  return cell(d, r.cells[0], t, r.kind)
}

/** The designed newsletter as email safe HTML (target "email": glyph icons, initials instead of a photo, a logo address) or for the screen (target "web": inline line icons, the photo if chosen). */
export function renderNewsletterHtml(input: DesignInput, target: Target = 'web'): string {
  const d = buildDesign(input)
  const stripe = d.pal.accent2
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent}" width="50%">&nbsp;</td><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent2}" width="30%">&nbsp;</td><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.tint2}" width="20%">&nbsp;</td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${d.pal.accent}">&nbsp;</td></tr></table>`
  const logo = d.brand.logo ? `<img src="${esc(d.brand.logo)}" alt="${esc(d.brand.name)} logo" height="44" style="display:block;height:44px;width:auto;max-width:180px;border:0">` : ''
  const mast = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 24px 14px" valign="middle">${logo || `<span style="font-size:18px;font-weight:700;color:${d.pal.dark}">${esc(d.brand.name)}</span>`}</td><td align="right" valign="middle" style="padding:18px 24px 14px;font-size:13px;color:${MUTED}">${logo ? `<span style="font-weight:700;color:${INK}">${esc(d.brand.name)}</span><br>` : ''}Staff newsletter</td></tr></table>`
  const sampleTag = d.sample ? `<span style="display:inline-block;margin-left:8px;padding:3px 10px;border:1px dashed ${d.pal.accent};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.8px;color:${d.pal.dark};background:#FFFFFF">SAMPLE</span>` : ''
  const intro = d.intro.length ? `<tr><td style="padding:0 24px 14px;font-size:16px;line-height:1.6;color:${INK}">${paras(d.intro, 16)}</td></tr>` : ''
  const banner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${d.pal.tint2}"><tr><td style="padding:22px 24px"><span style="display:inline-block;padding:4px 12px;background:#FFFFFF;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${d.pal.dark}">${esc(d.kicker)}</span>${sampleTag}<h1 style="margin:12px 0 4px;font-family:${d.look.headFont};font-size:28px;line-height:1.2;color:${d.pal.dark}">${esc(d.title)}</h1><div style="font-size:14px;color:${MUTED}">${esc(d.month)}</div></td></tr></table>`
  const rows = d.rows.map(r => `<tr><td style="padding:0 24px 14px">${rowHtml(d, r, target)}</td></tr>`).join('')
  const contact = (d.brand.contact ?? []).filter(Boolean).slice(0, 3).map(esc).join('<br>')
  const foot = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE}"><tr><td style="padding:16px 24px 20px;font-size:13px;line-height:1.6;color:${MUTED}"><strong style="color:${INK}">${esc(d.brand.name)}</strong>${contact ? `<br>${contact}` : ''}${d.sentBy ? `<br>Sent by ${esc(d.sentBy)}` : ''}<br>For the staff of ${esc(d.brand.name)} only.</td></tr></table>`
  const css = `<style>.nl-wrap h1,.nl-wrap h2{font-weight:700}@media only screen and (max-width:540px){.nl-wrap .nl-col{display:block!important;width:100%!important;padding:0 0 12px 0!important}}</style>`
  return `${css}<div class="nl-wrap" style="background:${PAGE};padding:14px 8px;font-family:${SANS}"><table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid ${LINE};border-radius:${Math.min(d.look.radius, 18)}px;overflow:hidden"><tr><td>${stripe}${mast}${banner}</td></tr><tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>${intro}${rows}<tr><td>${foot}</td></tr></table></div>`
}

/** What the HTML says as plain text, for tests and a text part. */
export const htmlToText = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()

// ── PDF: the same design model drawn with pdfkit ───────────────────────────────────────
const pdfSafe = (s: string) => String(s ?? '').normalize('NFC').replace(/[‘’]/g, '’').replace(/[^\u0009\u000A -~ -ÿ’“”…•€]/g, '')
export async function renderNewsletterPdf(input: DesignInput, logoPng?: Buffer | null, photoPng?: Buffer | null): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit')
  const d = buildDesign(input)
  const W = 595.28, H = 841.89, M = 36, CW = W - M * 2, G = 10
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: pdfSafe(d.title), Author: pdfSafe(d.brand.name) } })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const BOTTOM = H - M - 34
  let y = M
  const newPage = () => { doc.addPage(); y = M }
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
  const textH = (text: string, w: number, size: number, font = 'Helvetica', gap = 2.5) => { doc.font(font).fontSize(size); return doc.heightOfString(pdfSafe(text), { width: w, lineGap: gap }) }
  const bodyH = (s: Sec, w: number, size: number) => {
    let h = 0
    for (const b of s.blocks) h += s.role === 'quote' ? textH(unquote(b.text), w - 18, size, 'Helvetica-Oblique') + 6 : b.t === 'p' ? textH(b.text, w, size) + 6 : textH(b.text, w - 16, size) + 4
    return h
  }
  const drawBody = (s: Sec, x: number, yy: number, w: number, size: number) => {
    let cy = yy
    for (const b of s.blocks) {
      if (s.role === 'quote') { const q = unquote(b.text); doc.fillColor(d.pal.accent).font('Times-Bold').fontSize(size + 8).text('\u201C', x, cy - 4, { width: 14, lineBreak: false }); doc.fillColor(INK).font('Helvetica-Oblique').fontSize(size).text(pdfSafe(q), x + 18, cy, { width: w - 18, lineGap: 2.5 }); cy += textH(q, w - 18, size, 'Helvetica-Oblique') + 6; continue }
      if (b.t === 'p') { doc.fillColor(INK).font('Helvetica').fontSize(size).text(pdfSafe(b.text), x, cy, { width: w, lineGap: 2.5 }); cy += textH(b.text, w, size) + 6 }
      else { icon('check', x, cy - 0.5, size + 1, d.pal.accent); doc.fillColor(INK).font('Helvetica').fontSize(size).text(pdfSafe(b.text), x + 16, cy, { width: w - 16, lineGap: 2.5 }); cy += textH(b.text, w - 16, size) + 4 }
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
  const titleH = textH(d.title, CW - 32, 24, 'Helvetica-Bold', 1)
  const bh = 22 + 12 + titleH + 22
  doc.save(); doc.rect(M - 6, y, CW + 12, bh).fillColor(d.pal.tint2).fill(); doc.restore()
  doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(8).text(pdfSafe(d.kicker.toUpperCase() + (d.sample ? '   SAMPLE' : '')), M + 10, y + 12, { width: CW - 20, characterSpacing: 0.8 })
  doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(24).text(pdfSafe(d.title), M + 10, y + 26, { width: CW - 20, lineGap: 1 })
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(pdfSafe(d.month), M + 10, y + 26 + titleH + 4, { width: CW - 20 })
  y += bh + 14
  if (d.intro.length) { const t = d.intro.map(b => b.text).join(' '); doc.fillColor(INK).font('Helvetica').fontSize(11.5).text(pdfSafe(t), M, y, { width: CW, lineGap: 3 }); y += textH(t, CW, 11.5, 'Helvetica', 3) + 12 }

  const cardInner = (s: Sec, w: number, big: boolean) => ({ size: big ? 11.5 : 10.5, hw: w - 28, titleSize: big ? 14 : 12.5 })
  const cardHeight = (s: Sec, w: number, big: boolean, withPhoto = false) => {
    const c = cardInner(s, w, big); const textW = withPhoto ? c.hw - 120 : c.hw
    const h = 14 + Math.max(34, 4) + 6 + bodyH(s, textW, c.size) + 8
    return withPhoto ? Math.max(h, 150) : h   // room for the round picture
  }
  const drawCard = (s: Sec, x: number, yy: number, w: number, h: number, big: boolean, tinted: boolean, withPhoto = false) => {
    const bg = tinted || d.look.cardStyle === 'soft' ? d.pal.tint : '#FFFFFF'
    fillBox(x, yy, w, h, bg, d.look.cardStyle === 'outline' ? d.pal.tint2 : LINE, d.look.cardStyle === 'rule' ? d.pal.accent : undefined)
    const c = cardInner(s, w, big); const px = x + 14
    bubble(s.icon, px, yy + 12, 28)
    doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(c.titleSize).text(pdfSafe(s.title), px + 38, yy + 12 + (28 - c.titleSize) / 2 - 1, { width: c.hw - 38 - (withPhoto ? 112 : 0), lineBreak: false, ellipsis: true })
    const stat = statValues(s)
    if (stat) {
      const cw = (c.hw - (stat.length - 1) * 6) / stat.length
      stat.forEach((st, i) => { const sx = px + i * (cw + 6); doc.save(); doc.roundedRect(sx, yy + 50, cw, 52, 8).fillColor(d.pal.tint).fill(); doc.restore(); doc.fillColor(d.pal.accent).font('Helvetica-Bold').fontSize(22).text(st.n, sx, yy + 56, { width: cw, align: 'center' }); doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(pdfSafe(st.label), sx + 4, yy + 84, { width: cw - 8, align: 'center' }) })
    } else drawBody(s, px, yy + 50, withPhoto ? c.hw - 120 : c.hw, c.size)
    if (withPhoto) {
      const D = 84, cx = x + w - 14 - D, cy = yy + 50
      if (photoPng) { try { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).clip(); doc.image(photoPng, cx, cy, { cover: [D, D], align: 'center', valign: 'center' }); doc.restore() } catch { /* no photo */ } doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).lineWidth(2).strokeColor(d.pal.tint2).stroke(); doc.restore() }
      else if (d.sample && !d.photo) {
        doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore()
        doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).clip(); doc.fillColor(d.pal.accent).opacity(0.55); doc.circle(cx + D / 2, cy + D * 0.38, D * 0.17).fill(); doc.moveTo(cx + D * 0.16, cy + D).bezierCurveTo(cx + D * 0.18, cy + D * 0.72, cx + D * 0.33, cy + D * 0.62, cx + D / 2, cy + D * 0.62).bezierCurveTo(cx + D * 0.67, cy + D * 0.62, cx + D * 0.82, cy + D * 0.72, cx + D * 0.84, cy + D).fill(); doc.restore()
      }
      else { doc.save(); doc.circle(cx + D / 2, cy + D / 2, D / 2).fillColor(d.pal.tint2).fill(); doc.restore(); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(24).text(initials(d.photo?.name ?? '') || '*', cx, cy + D / 2 - 14, { width: D, align: 'center' }) }
    }
  }
  function statValues(s: Sec): Array<{ n: string; label: string }> | null {
    const li = s.blocks.filter(b => b.t === 'li'); const m = li.map(b => /^(\d{1,4})\s+(.{2,60})$/.exec(b.text)).filter(Boolean) as RegExpExecArray[]
    return m.length >= 2 && m.length === li.length && m.length <= 4 ? m.map(x => ({ n: x[1], label: x[2] })) : null
  }
  const personHero = (s: Sec) => s.role === 'person' && (!!d.photo || (d.sample && (s.key === 'who' || s.key === 'story')))
  const need = (h: number) => { if (y + h > BOTTOM) newPage() }
  for (const r of d.rows) {
    if (r.kind === 'pair') {
      const w = (CW - G) / 2
      const h = Math.max(...r.cells.map(c => (statValues(c) ? 112 : cardHeight(c, w, false))))
      need(h + G); r.cells.forEach((c, i) => drawCard(c, M + i * (w + G), y, w, h, false, c.role === 'thanks')); y += h + G
    } else if (r.kind === 'quote') {
      const s = r.cells[0], qs = s.blocks.map(b => unquote(b.text)).filter(Boolean)
      const h = 34 + qs.reduce((a, q) => a + textH(q, CW - 76, 12.5, 'Helvetica-Oblique') + 10, 0) + 10
      need(h + G); fillBox(M, y, CW, h, d.pal.tint2)
      doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(12).text(pdfSafe(s.title), M + 18, y + 14, { width: CW - 36, lineBreak: false })
      let qy = y + 36
      for (const q of qs) { doc.fillColor(d.pal.accent).font('Times-Bold').fontSize(34).text('“', M + 18, qy - 8, { width: 26, lineBreak: false }); doc.fillColor(INK).font('Helvetica-Oblique').fontSize(12.5).text(pdfSafe(q), M + 52, qy, { width: CW - 76, lineGap: 2.5 }); qy += textH(q, CW - 76, 12.5, 'Helvetica-Oblique') + 10 }
      y += h + G
    } else if (r.kind === 'cta') {
      const s = r.cells[0]; const label = /nominate/i.test(s.title) ? 'How to nominate' : /book/i.test(s.title) ? 'Book your holiday' : s.title
      const h = cardHeight(s, CW, true) + 36
      need(h + G); drawCard(s, M, y, CW, h, true, true)
      const bw = Math.min(CW - 28, doc.font('Helvetica-Bold').fontSize(12).widthOfString(pdfSafe(label)) + 36)
      const linked = !!(/holiday|book|time off/i.test(s.title) && d.links.holiday)
      doc.save(); doc.roundedRect(M + 14, y + h - 40, bw, 28, 8)
      if (linked) doc.fillColor(d.pal.accent).fill(); else doc.fillColor('#FFFFFF').fill().roundedRect(M + 14, y + h - 40, bw, 28, 8).lineWidth(1.6).strokeColor(d.pal.accent).stroke()
      doc.restore()
      doc.fillColor(linked ? '#FFFFFF' : d.pal.dark).font('Helvetica-Bold').fontSize(12).text(pdfSafe(label), M + 14, y + h - 32, { width: bw, align: 'center', lineBreak: false })
      y += h + G
    } else if (r.kind === 'footer') {
      const s = r.cells[0]; const h = cardHeight(s, CW, false)
      need(h + G); fillBox(M, y, CW, h, d.pal.tint);       bubble(s.icon, M + 14, y + 12, 28); doc.fillColor(d.pal.dark).font('Helvetica-Bold').fontSize(12.5).text(pdfSafe(s.title), M + 52, y + 19, { width: CW - 70, lineBreak: false }); drawBody(s, M + 14, y + 50, CW - 28, 10.5); y += h + G
    } else {
      const s = r.cells[0], big = r.kind === 'hero', ph = big && personHero(s)
      const h = Math.max(cardHeight(s, CW, big, ph), ph ? 118 : 0, statValues(s) ? 112 : 0)
      need(h + G); drawCard(s, M, y, CW, h, big, big || s.role === 'thanks', ph); y += h + G
    }
  }
  // footer on every page
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i); doc.page.margins.bottom = 0
    if (input.stamp) doc.fillColor('#B91C1C').font('Helvetica-Bold').fontSize(8).text(pdfSafe(input.stamp), M, 14, { width: CW, align: 'center', lineBreak: false })
    doc.moveTo(M, H - M - 26).lineTo(W - M, H - M - 26).lineWidth(0.6).strokeColor(LINE).stroke()
    const line = [d.brand.name, ...(d.brand.contact ?? []).slice(0, 2), d.sentBy ? `Sent by ${d.sentBy}` : '', 'Staff only'].filter(Boolean).join('   |   ')
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(pdfSafe(line), M, H - M - 20, { width: CW - 70, height: 10, lineBreak: false, ellipsis: true })
    doc.text(`Page ${i + 1} of ${range.count}`, M, H - M - 20, { width: CW, align: 'right', lineBreak: false })
  }
  doc.end()
  return done
}

/** One sample design for every layout of a newsletter type (for the thumbnails). */
export function sampleDesigns(type: string, brand: Brand): Array<{ id: string; layout: string; title: string; html: string }> {
  return NEWSLETTER_TEMPLATES.filter(t => t.type === type).map(t => ({ id: t.id, layout: t.layout, title: t.title, html: renderNewsletterHtml({ templateId: t.id, title: t.type_title, body: sampleBody(t), brand, sentBy: 'Your name', monthText: monthNow(), sample: true }, 'web') }))
}
