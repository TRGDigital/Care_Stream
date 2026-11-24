// Sickness recording (holiday pilot, CS-1001, administrators only). Pure rules: no database, no network, so they can be tested on their own.
// Sickness is kept SEPARATE from holiday. It never changes a balance and staff, managers and the hub never see it: it is health information.
//
// A SPELL is one run of sickness. It has stored days (one row per day the person was off, with the hours) and, while it is open ended ("still off sick"),
// every day from the day after the last stored day up to today also counts, at the spell's usual hours, until an administrator ends it.

import { addDays, ukToday } from './holiday-math'

export type SickPart = 'full' | 'am' | 'pm' | 'part'
export interface SickDayRow { day: string; hours: number; part?: SickPart }
export const SICK_KINDS = ['sick', 'injury', 'medical appointment'] as const
export type SickKind = typeof SICK_KINDS[number]
export const CERTIFICATES = ['none', 'self', 'fit note'] as const
export type Certificate = typeof CERTIFICATES[number]
export const SICK_NOTE_MAX = 200
export const MAX_SICK_HOURS = 13
export const MAX_SPELL_DAYS = 120

export interface SickSpell {
  id: string; user_id: string; first_day: string; last_day: string | null
  note: string | null; kind: SickKind; certificate: Certificate | null; return_to_work_done: boolean; hours_default: number
  days: SickDayRow[]
}

const YMD = /^\d{4}-\d{2}-\d{2}$/
export const isYmd = (s: unknown): s is string => typeof s === 'string' && YMD.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
const PARTS: SickPart[] = ['full', 'am', 'pm', 'part']
const normPart = (p: unknown): SickPart => (PARTS.includes(p as SickPart) ? (p as SickPart) : 'full')
/** A morning or an afternoon counts as half a day for sickness counts. */
export const dayEquivalent = (part?: string) => (part === 'am' || part === 'pm' ? 0.5 : 1)

/** Every day a spell counts for up to today: its stored days, plus (while open ended) each day after the last stored day up to today at the usual hours. */
export function effectiveDays(spell: Pick<SickSpell, 'first_day' | 'last_day' | 'days' | 'hours_default'>, today: string = ukToday()): SickDayRow[] {
  const stored = [...spell.days].sort((a, b) => a.day.localeCompare(b.day))
  if (spell.last_day !== null) return stored
  const from = stored.length ? addDays(stored[stored.length - 1].day, 1) : spell.first_day
  const out = [...stored]
  for (let d = from, i = 0; d <= today && i < MAX_SPELL_DAYS * 4; d = addDays(d, 1), i++) out.push({ day: d, hours: spell.hours_default, part: 'full' })
  return out
}

export type SpellInput = { first_day: unknown; last_day?: unknown; still_off?: unknown; days?: unknown; hours_default?: unknown; note?: unknown; kind?: unknown; certificate?: unknown; return_to_work_done?: unknown }
export type CleanSpell = { first_day: string; last_day: string | null; days: SickDayRow[]; hours_default: number; note: string | null; kind: SickKind; certificate: Certificate | null; return_to_work_done: boolean }

/** Checks what the overlay sends. Sickness is recorded as it happens: any past day or today, never a future day. */
export function validateSpell(input: SpellInput, today: string = ukToday()): { ok: true; spell: CleanSpell } | { ok: false; error: string } {
  const still = input.still_off === true
  if (!isYmd(input.first_day)) return { ok: false, error: 'Choose the first day.' }
  const first = input.first_day
  if (first > today) return { ok: false, error: 'Sickness can only be recorded up to today.' }
  let last: string | null = null
  if (!still) {
    if (!isYmd(input.last_day)) return { ok: false, error: 'Choose the last day, or tick that they are still off sick.' }
    last = input.last_day
    if (last < first) return { ok: false, error: 'The last day cannot be before the first day.' }
    if (last > today) return { ok: false, error: 'Sickness can only be recorded up to today. Tick "still off sick" if they are not back yet.' }
  }
  const end = last ?? today
  if (addDays(first, MAX_SPELL_DAYS) < end) return { ok: false, error: `A spell can cover at most ${MAX_SPELL_DAYS} days here. Record a long absence in parts.` }
  const hd = Number(input.hours_default ?? 8)
  const hours_default = Number.isFinite(hd) && hd >= 0.5 && hd <= MAX_SICK_HOURS ? Math.round(hd * 2) / 2 : 8
  const raw = Array.isArray(input.days) ? input.days : []
  const seen = new Set<string>(), days: SickDayRow[] = []
  for (const r of raw as any[]) {
    if (!isYmd(r?.day)) return { ok: false, error: 'One of the dates is not valid.' }
    if (seen.has(r.day)) return { ok: false, error: 'A date appears twice.' }
    if (r.day < first || r.day > end) return { ok: false, error: 'Every day must fall between the first and last day.' }
    const h = Number(r.hours)
    if (!Number.isFinite(h) || h < 0.5 || h > MAX_SICK_HOURS) return { ok: false, error: `Hours for each day must be between 0.5 and ${MAX_SICK_HOURS}.` }
    seen.add(r.day)
    days.push({ day: r.day, hours: Math.round(h * 2) / 2, part: normPart(r.part) })
  }
  days.sort((a, b) => a.day.localeCompare(b.day))
  if (!still && days.length === 0) return { ok: false, error: 'Choose at least one day they were off.' }
  const kind = (SICK_KINDS as readonly string[]).includes(String(input.kind)) ? (input.kind as SickKind) : 'sick'
  const cert = (CERTIFICATES as readonly string[]).includes(String(input.certificate)) ? (input.certificate as Certificate) : null
  const note = String(input.note ?? '').replace(/\s+/g, ' ').trim().slice(0, SICK_NOTE_MAX) || null
  return { ok: true, spell: { first_day: first, last_day: last, days, hours_default, note, kind, certificate: cert, return_to_work_done: input.return_to_work_done === true } }
}

/** The days of an approved booking that fall on days of sickness (shown to the administrator as a warning before saving). */
export function holidayOverlap(sickDays: string[], holiday: Array<{ day: string; request_id: string; hours: number }>): Array<{ day: string; request_id: string; hours: number }> {
  const s = new Set(sickDays)
  return holiday.filter(h => s.has(h.day))
}

// ── Reports ──────────────────────────────────────────────────────────────────────────────
export interface ReportPerson { id: string; name: string; job_role: string | null }
export interface ReportRow {
  user_id: string; name: string; job_role: string | null; spells: number; days: number; hours: number; first_day: string; last_day: string
  certificate: string; return_to_work: 'Yes' | 'No' | 'Some'; still_off: boolean; bradford: number
}
export interface ReportDayRow { day: string; weekday: string; user_id: string; name: string; job_role: string | null; hours: number; part: string; kind: string; certificate: string; return_to_work: 'Yes' | 'No'; still_off: boolean; note: string | null }
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const weekdayName = (ymd: string) => WEEKDAY[new Date(ymd + 'T00:00:00Z').getUTCDay()]
const round2 = (n: number) => Math.round(n * 100) / 100

/** Bradford factor: the number of spells squared, times the total days off. A common measure that weights frequent short absences more than one long one. */
export const bradford = (spells: number, days: number): number => round2(spells * spells * days)

/** What the report shows: only spells with at least one day inside the dates, and only the days inside the dates. */
export function sicknessReport(o: { spells: SickSpell[]; people: ReportPerson[]; from: string; to: string; today?: string; userId?: string | null }) {
  const today = o.today ?? ukToday()
  const person = new Map(o.people.map(x => [x.id, x]))
  const byPerson = new Map<string, Array<{ spell: SickSpell; days: SickDayRow[] }>>()
  for (const spell of o.spells) {
    if (o.userId && spell.user_id !== o.userId) continue
    const inRange = effectiveDays(spell, today).filter(d => d.day >= o.from && d.day <= o.to)
    if (!inRange.length) continue
    byPerson.set(spell.user_id, [...(byPerson.get(spell.user_id) ?? []), { spell, days: inRange }])
  }
  const rows: ReportRow[] = [], days: ReportDayRow[] = []
  for (const [uid, list] of byPerson) {
    const who = person.get(uid) ?? { id: uid, name: 'Former member of staff', job_role: null }
    const all = list.flatMap(l => l.days.map(d => ({ ...d, spell: l.spell })))
    const dayCount = round2(all.reduce((s, d) => s + dayEquivalent(d.part), 0))
    const rtw = list.filter(l => l.spell.return_to_work_done).length
    const certs = [...new Set(list.map(l => l.spell.certificate).filter(Boolean) as string[])]
    rows.push({
      user_id: uid, name: who.name, job_role: who.job_role, spells: list.length, days: dayCount, hours: round2(all.reduce((s, d) => s + d.hours, 0)),
      first_day: all.map(d => d.day).sort()[0], last_day: all.map(d => d.day).sort().slice(-1)[0],
      certificate: certs.length ? certs.join(', ') : 'none', return_to_work: rtw === list.length ? 'Yes' : rtw === 0 ? 'No' : 'Some',
      still_off: list.some(l => l.spell.last_day === null), bradford: bradford(list.length, dayCount),
    })
    for (const d of all) days.push({ day: d.day, weekday: weekdayName(d.day), user_id: uid, name: who.name, job_role: who.job_role, hours: d.hours, part: d.part && d.part !== 'full' ? d.part.toUpperCase() : 'Full', kind: d.spell.kind, certificate: d.spell.certificate ?? 'none', return_to_work: d.spell.return_to_work_done ? 'Yes' : 'No', still_off: d.spell.last_day === null, note: d.spell.note })
  }
  rows.sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
  days.sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name))
  return { rows, days, totals: { people: rows.length, spells: rows.reduce((s, r) => s + r.spells, 0), days: round2(rows.reduce((s, r) => s + r.days, 0)), hours: round2(rows.reduce((s, r) => s + r.hours, 0)) } }
}

// ── CSV (opens in Excel: UTF-8 with a byte order mark and Windows line breaks) ───────────────
export const BOM = '﻿'
/** One CSV cell. A cell that starts with = + - @ or a tab could be run as a formula by a spreadsheet, so it is made plain text with a leading apostrophe. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (rows: unknown[][]): string => BOM + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

export function summaryCsv(r: ReturnType<typeof sicknessReport>): string {
  return toCsv([
    ['Name', 'Job title', 'Spells', 'Sick days', 'Sick hours', 'First day', 'Last day', 'Certificate', 'Return to work done', 'Still off sick', 'Bradford factor'],
    ...r.rows.map(x => [x.name, x.job_role ?? '', x.spells, x.days, x.hours, x.first_day, x.last_day, x.certificate, x.return_to_work, x.still_off ? 'Yes' : 'No', x.bradford]),
  ])
}
export function dayByDayCsv(r: ReturnType<typeof sicknessReport>, includeNotes: boolean): string {
  return toCsv([
    ['Date', 'Day', 'Name', 'Job title', 'Hours', 'Part of day', 'Kind', 'Certificate', 'Return to work done', 'Still off sick', ...(includeNotes ? ['Note'] : [])],
    ...r.days.map(x => [x.day, x.weekday, x.name, x.job_role ?? '', x.hours, x.part, x.kind, x.certificate, x.return_to_work, x.still_off ? 'Yes' : 'No', ...(includeNotes ? [x.note ?? ''] : [])]),
  ])
}

export interface MonthEntry { day: string; user_id: string; name: string; job_role: string | null; type: 'Holiday' | 'Sick'; hours: number; part?: string; status: string; note?: string | null }
/** The whole month, one row per person per day, holiday and sickness together. Sickness notes only when asked for. */
export function monthCsv(month: string, entries: MonthEntry[], includeNotes: boolean): string {
  const rows = entries.filter(e => e.day.startsWith(month)).sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name) || a.type.localeCompare(b.type))
  return toCsv([
    ['Date', 'Day', 'Name', 'Job title', 'Type', 'Hours', 'Part of day', 'Status', ...(includeNotes ? ['Note'] : [])],
    ...rows.map(e => [e.day, weekdayName(e.day), e.name, e.job_role ?? '', e.type, e.hours, e.part && e.part !== 'full' ? e.part.toUpperCase() : 'Full', e.status, ...(includeNotes ? [e.type === 'Sick' ? (e.note ?? '') : ''] : [])]),
  ])
}
