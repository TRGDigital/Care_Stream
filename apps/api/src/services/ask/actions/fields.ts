// Personalised fields in staff messages. The agent writes the message with placeholders and the CODE fills in each person's OWN figure when it is sent, so the AI never
// has to see everyone's numbers and nobody is shown anyone else's. Staff can already see their own balance in My holidays, so their own figures are fine in a message to them.
export const PERSONAL_FIELDS = ['first_name', 'hours_left', 'hours_taken', 'holiday_year_end', 'training_due'] as const
export type PersonalField = (typeof PERSONAL_FIELDS)[number]
export interface PersonalValues { first_name: string; hours_left: string; hours_taken: string; holiday_year_end: string; training_due: string }

const TOKEN = /\{\{?\s*([a-z_]+)\s*\}\}?/gi

/** The placeholders used in a text, and any that are not allowed. */
export function fieldsIn(text: string): { used: PersonalField[]; unknown: string[] } {
  const used = new Set<PersonalField>(), unknown = new Set<string>()
  for (const m of text.matchAll(TOKEN)) { const k = m[1].toLowerCase(); if ((PERSONAL_FIELDS as readonly string[]).includes(k)) used.add(k as PersonalField); else unknown.add(m[1]) }
  return { used: [...used], unknown: [...unknown] }
}
export const hasPersonal = (text: string): boolean => fieldsIn(text).used.length > 0

/** Fill the placeholders with one person's values. Anything else in braces is left as it was. */
export function renderPersonal(text: string, v: PersonalValues): string {
  return text.replace(TOKEN, (whole, k: string) => { const key = k.toLowerCase(); return (PERSONAL_FIELDS as readonly string[]).includes(key) ? String((v as any)[key] ?? '') : whole })
}

const unitWord = (unit: 'hours' | 'days', n: number) => (unit === 'days' ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'hour' : 'hours'))
const fmt = (n: number) => (Math.round(n * 100) / 100).toString()
const UKDATE = (ymd: string | null) => (ymd ? new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '')

export function personalValues(o: { name: string; unit: 'hours' | 'days'; remaining: number | null; taken: number | null; yearEnd: string | null; trainingDue: number }): PersonalValues {
  const first = String(o.name || '').trim().split(/\s+/)[0] || 'there'
  return {
    first_name: first,
    hours_left: o.remaining == null ? 'your remaining holiday' : `${fmt(o.remaining)} ${unitWord(o.unit, o.remaining)}`,
    hours_taken: o.taken == null ? 'none recorded yet' : `${fmt(o.taken)} ${unitWord(o.unit, o.taken)}`,
    holiday_year_end: UKDATE(o.yearEnd) || 'the end of the holiday year',
    training_due: o.trainingDue > 0 ? `${o.trainingDue} ${o.trainingDue === 1 ? 'course' : 'courses'}` : 'no courses',
  }
}
