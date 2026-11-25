// The sums and readings for the other uploaded files (a rota, a holiday sheet, a training list, a letter, a newsletter). All plain code: the model never
// works out a figure or decides a match, it explains these results. Nothing here changes anything in CareStream.
import { round2 } from '../calc'
import type { Mapping, StaffLite } from './calc'

const norm = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an and or of to in on for with is are be by at as it its this that from we our you your will shall must should not no all any each per into than then also may can has have had was were their they them there which who whom what when where how'.split(' '))
const words = (s: string) => norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w))
const iso = (s: string | null | undefined): string | null => {
  const t = String(s ?? '').trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)

// ── Names out of letters and newsletters ──────────────────────────────────────────────
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Replaces each staff member's full name (either order) and a greeting name ("Dear Sam") with [name], so no staff name is kept. */
export function scrubStaffNames(text: string, names: string[]): string {
  let out = String(text ?? '')
  for (const n of names) {
    const t = n.trim().split(/\s+/).filter(Boolean)
    if (t.length < 2) continue
    const first = t[0], last = t[t.length - 1]
    out = out.replace(new RegExp(`\\b${esc(first)}\\s+(?:[A-Za-z'-]+\\s+)?${esc(last)}\\b`, 'gi'), '[name]').replace(new RegExp(`\\b${esc(last)},\\s*${esc(first)}\\b`, 'gi'), '[name]')
  }
  return out.replace(/\b(Dear|Hi|Hello|To)\s+(?:Mr|Mrs|Ms|Miss|Dr)?\.?\s*[A-Z][a-z'-]+(?=[,\s.!])/g, '$1 [name]')
}

// ── Rota or timesheet hours against contracted hours ──────────────────────────────────
export interface HoursRow { row: number; name: string; hours: number | null; contracted: number | null }
const TOL_H = 0.25
export function compareRota(rows: HoursRow[], mapping: Mapping, staff: StaffLite[], weeks: number) {
  const byId = new Map(staff.map(s => [s.id, s])), seen = new Set<string>()
  const w = weeks > 0 ? weeks : 1
  const onTarget: string[] = [], under: any[] = [], over: any[] = [], noContract: string[] = [], noHours: string[] = [], onlyInFile: string[] = []
  for (const r of rows) {
    const id = mapping[String(r.row)]; const s = id ? byId.get(id) : undefined
    if (!s) { onlyInFile.push(r.name); continue }
    seen.add(s.id)
    if (r.hours == null) { noHours.push(s.name); continue }
    const per = r.contracted ?? s.contracted
    if (per == null) { noContract.push(s.name); continue }
    const expected = round2(per * (r.contracted != null ? 1 : w))
    const diff = round2(r.hours - expected)
    const e = { name: s.name, job_role: s.job_role, hours_in_file: round2(r.hours), contracted_for_period: expected, difference: diff }
    if (Math.abs(diff) < TOL_H) onTarget.push(s.name); else if (diff > 0) over.push({ ...e, overtime_hours: diff }); else under.push({ ...e, short_by: round2(-diff) })
  }
  over.sort((a, b) => b.difference - a.difference); under.sort((a, b) => a.difference - b.difference)
  return {
    compared: onTarget.length + under.length + over.length, on_target: onTarget.length, over_contracted: over, under_contracted: under,
    totals: { overtime_hours: round2(over.reduce((s, x) => s + x.overtime_hours, 0)), hours_short: round2(under.reduce((s, x) => s + x.short_by, 0)), people_over: over.length, people_under: under.length },
    no_hours_in_file: noHours, no_contracted_hours_in_carestream: noContract, only_in_file: onlyInFile, only_in_carestream: staff.filter(s => !seen.has(s.id)).map(s => s.name),
    weeks_used: w,
  }
}

// ── A holiday sheet from an old system against CareStream's balances ──────────────────
export interface HolidaySheetRow { row: number; name: string; allowance: number | null; taken: number | null; remaining: number | null }
export interface CsHoliday { user_id: string; name: string; unit: string; entitlement: number; taken: number; booked: number; remaining: number }
export function compareHolidaySheet(rows: HolidaySheetRow[], mapping: Mapping, cs: CsHoliday[], factor: number) {
  const byId = new Map(cs.map(c => [c.user_id, c])), seen = new Set<string>()
  const f = factor > 0 ? factor : 1
  const same: string[] = [], differ: any[] = [], onlyInFile: string[] = []
  for (const r of rows) {
    const id = mapping[String(r.row)]; const c = id ? byId.get(id) : undefined
    if (!c) { onlyInFile.push(r.name); continue }
    seen.add(c.user_id)
    const fa = r.allowance != null ? round2(r.allowance * f) : null, ft = r.taken != null ? round2(r.taken * f) : null, fr = r.remaining != null ? round2(r.remaining * f) : null
    const gaps: Array<{ what: string; file: number; carestream: number; difference: number }> = []
    const add = (what: string, a: number | null, b: number) => { if (a != null && Math.abs(a - b) >= 0.01) gaps.push({ what, file: a, carestream: round2(b), difference: round2(a - b) }) }
    add('allowance (with carried over)', fa, c.entitlement); add('taken', ft, c.taken); add('remaining', fr, c.remaining)
    if (!gaps.length) same.push(c.name); else differ.push({ name: c.name, unit: c.unit, gaps, carestream_booked_still_to_come: round2(c.booked) })
  }
  return { compared: same.length + differ.length, agree: same.length, differ, only_in_file: onlyInFile, only_in_carestream: cs.filter(c => !seen.has(c.user_id)).map(c => c.name), unit_note: `CareStream holds balances in ${cs[0]?.unit ?? 'hours'}; the file was multiplied by ${f} to match.` }
}

// ── A training list from elsewhere against the required training by role ───────────────
export interface TrainingFileRow { row: number; name: string; course: string; completed: string | null; expiry: string | null }
export interface MatrixLite { columns: Array<{ key: string; label: string }>; rows: Array<{ user_id: string; name: string; job_role: string | null; cells: Record<string, { required: boolean; status: string }> }> }
const courseTokens = (s: string) => new Set(words(s))
export function sameCourse(a: string, b: string): boolean {
  const x = courseTokens(a), y = courseTokens(b)
  if (!x.size || !y.size) return false
  const inter = [...x].filter(w => y.has(w)).length
  return inter / Math.min(x.size, y.size) >= 0.75 && inter / Math.max(x.size, y.size) >= 0.4
}
const MET = new Set(['in_date', 'due_soon'])
export function compareTraining(rows: TrainingFileRow[], mapping: Mapping, m: MatrixLite, today: string, soonDays = 60) {
  const byId = new Map(m.rows.map(r => [r.user_id, r]))
  const mine = new Map<string, TrainingFileRow[]>(), onlyInFile: string[] = []
  for (const r of rows) { const id = mapping[String(r.row)]; if (!id || !byId.has(id)) { if (!onlyInFile.includes(r.name)) onlyInFile.push(r.name); continue } mine.set(id, [...(mine.get(id) ?? []), r]) }
  const people: any[] = []; let clean = 0
  for (const [id, list] of mine) {
    const p = byId.get(id)!
    const required = m.columns.filter(c => p.cells[c.key]?.required)
    const missing: string[] = [], expired: any[] = [], soon: any[] = [], fileOkCsGap: string[] = [], csOkFileMissing: string[] = [], noDate: string[] = []
    for (const c of required) {
      const hits = list.filter(l => sameCourse(l.course, c.label))
      const cs = p.cells[c.key]?.status ?? 'missing'
      if (!hits.length) { missing.push(c.label); if (MET.has(cs)) csOkFileMissing.push(c.label); continue }
      const newest = hits.map(h => ({ h, e: iso(h.expiry), d: iso(h.completed) })).sort((a, b) => (b.e ?? b.d ?? '').localeCompare(a.e ?? a.d ?? ''))[0]
      if (newest.e) {
        const left = daysBetween(today, newest.e)
        if (left < 0) expired.push({ course: c.label, expired_on: newest.e }); else if (left <= soonDays) soon.push({ course: c.label, expires_on: newest.e })
        else if (!MET.has(cs)) fileOkCsGap.push(c.label)
      } else { noDate.push(c.label); if (!MET.has(cs)) fileOkCsGap.push(c.label) }
    }
    if (!missing.length && !expired.length && !soon.length && !fileOkCsGap.length) { clean++; continue }
    people.push({ name: p.name, job_role: p.job_role, required_courses: required.length, required_but_not_in_file: missing, expired_in_file: expired, expiring_soon_in_file: soon, in_file_with_no_expiry_date: noDate, file_says_in_date_but_carestream_has_a_gap: fileOkCsGap, carestream_in_date_but_not_in_file: csOkFileMissing })
  }
  people.sort((a, b) => (b.required_but_not_in_file.length + b.expired_in_file.length) - (a.required_but_not_in_file.length + a.expired_in_file.length))
  return { people_compared: mine.size, fully_matching_the_requirement: clean, people_to_look_at: people, only_in_file: onlyInFile, only_in_carestream: m.rows.filter(r => !mine.has(r.user_id)).length, soon_days: soonDays }
}

/** Short lines that look like headings: numbered, ALL CAPS, or a few title words. */
export function headingsOf(text: string): string[] {
  const out: string[] = []
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const l = raw.trim()
    if (!l || l.length > 90 || /[.;,]$/.test(l)) continue
    const numbered = /^(\d+(\.\d+)*[.)]?|[A-Z][.)])\s+\S/.test(l)
    const upper = l.length > 3 && l === l.toUpperCase() && /[A-Z]/.test(l)
    const titled = /^[A-Z][A-Za-z'&/ -]{2,60}:?$/.test(l) && l.split(' ').length <= 8 && !/^(The|This|It|We|You|Please)\b/.test(l)
    if ((numbered || upper || titled) && !out.includes(l)) out.push(l)
  }
  return out.slice(0, 60)
}

// ── A letter or a newsletter to reuse ─────────────────────────────────────────────────
export interface TemplateLite { id: string; title: string; text: string }
export function closestTemplates(text: string, templates: TemplateLite[], n = 3) {
  const w = new Set(words(text)); if (!w.size) return []
  return templates.map(t => { const tw = new Set(words(t.title + ' ' + t.text)); const inter = [...tw].filter(x => w.has(x)).length; return { id: t.id, title: t.title, score: round2(inter / Math.sqrt(tw.size * w.size || 1)) } }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n)
}
export function letterShape(text: string) {
  const t = String(text ?? '').trim(), paras = t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const greeting = /^(dear|hi|hello)\b[^\n]*/i.exec(t)?.[0] ?? null
  const signoff = /\b(yours sincerely|yours faithfully|kind regards|best wishes|regards|many thanks|thank you)\b/i.exec(t)?.[1] ?? null
  return { words: words(t).length, paragraphs: paras.length, greeting_style: greeting ? greeting.replace(/\[name\]/g, '[name]').slice(0, 40) : null, sign_off: signoff, has_subject_line: /^(re|subject)\s*[:\-]/im.test(t), money_amounts: (t.match(/£\s?\d[\d,]*(?:\.\d{2})?/g) ?? []).length, dates: (t.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi) ?? []).length, names_replaced: (t.match(/\[name\]/g) ?? []).length, tone: /\b(we are pleased|delighted|congratulations|thank you for)\b/i.test(t) ? 'warm' : /\b(you must|failure to|disciplinary|breach)\b/i.test(t) ? 'formal and firm' : 'neutral' }
}
export interface NewsletterTemplateLite { id: string; title: string; layout?: string; sections: string[] }
export function newsletterShape(text: string, templates: NewsletterTemplateLite[]) {
  const t = String(text ?? '')
  const hs = [...t.matchAll(/^(?:#{1,3}\s+)(.+)$/gm)].map(m => m[1].trim()); const heads = hs.length ? hs : headingsOf(t).slice(0, 12)
  const bullets = (t.match(/^\s*[-*•]\s+/gm) ?? []).length
  const fits = templates.map(tp => { const matched = heads.filter(h => tp.sections.some(s => sameCourse(h, s))).length; return { id: tp.id, title: tp.title, layout: tp.layout ?? null, sections_matched: matched, of: tp.sections.length, score: round2(matched / Math.max(tp.sections.length, heads.length || 1)) } }).filter(x => x.sections_matched > 0).sort((a, b) => b.score - a.score || b.sections_matched - a.sections_matched).slice(0, 4)
  return { words: words(t).length, headings: heads, bullet_points: bullets, closest_templates: fits, paragraphs: t.split(/\n\s*\n/).filter(p => p.trim()).length }
}
