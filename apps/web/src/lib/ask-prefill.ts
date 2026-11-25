// HOUSE RULE 8, READ WHAT THE ADMINISTRATOR HAS ALREADY SAID. Where it can be read for certain, a question form is filled in from the administrator's own words before they see it:
// a count ("two employees of the month" makes a people question take two), and names that match the account's staff ("Helen and Sam" ticks Helen and Sam). Anything not certain is left
// for the person to answer. This only reads their typed messages, never anything an agent wrote.
import type { AnswerValue, Question, QuestionForm } from '@/lib/ask-blocks'
import type { PickerPerson } from '@/lib/staff-picker'
import { maxPeople, peopleMode, withMode } from './ask-check'

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, both: 2, couple: 2, pair: 2 }
const NOUNS = '(?:employees?|staff|people|winners?|nominees?|members|carers?|colleagues|stars?|starters?|leavers?|names?)'
/** "two employees of the month", "2 winners", "both": the number of people they said. Null when they did not say. */
export function countFrom(text: string): number | null {
  const t = String(text ?? '').toLowerCase()
  const m = new RegExp(`\\b(\\d{1,2}|one|two|three|four|five|six)\\s+(?:new\\s+|of\\s+our\\s+|of\\s+the\\s+)?${NOUNS}\\b`).exec(t)
  if (m) { const n = /^\d/.test(m[1]) ? Number(m[1]) : WORDS[m[1]]; return n >= 1 && n <= 20 ? n : null }
  if (/\b(?:both|a pair of|a couple of)\b/.test(t) && new RegExp(NOUNS).test(t)) return 2
  return null
}
/** Who it is for, when they said: everyone, or one team. */
export function audienceFrom(text: string): { kind: 'all' } | { kind: 'team'; team: string } | null {
  const t = String(text ?? '').toLowerCase()
  const team = /\b(?:for|to)\s+(?:the\s+)?([a-z][a-z ]{1,30}?)\s+team\s+only\b/.exec(t) ?? /\b([a-z][a-z ]{1,30}?)\s+team\s+only\b/.exec(t)
  if (team) return { kind: 'team', team: team[1].trim() }
  return /\b(?:all staff|everyone|the whole team|every member of staff)\b/.test(t) ? { kind: 'all' } : null
}
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z' -]+/g, ' ').replace(/\s+/g, ' ').trim()
/** Staff named in the text: a full name, or a first name that is the only one in the list. Never a guess between two people with the same first name. */
export function peopleNamed(text: string, staff: PickerPerson[]): PickerPerson[] {
  const t = ' ' + norm(text) + ' '
  const found = new Map<string, PickerPerson>()
  for (const p of staff) { if (norm(p.name).split(' ').length > 1 && t.includes(' ' + norm(p.name) + ' ')) found.set(p.id, p) }
  for (const p of staff) {
    if (found.has(p.id)) continue
    const first = norm(p.name).split(' ')[0]
    if (first.length < 3 || !t.includes(' ' + first + ' ')) continue
    const same = staff.filter(x => norm(x.name).split(' ')[0] === first)
    const alreadyByFull = same.some(x => found.has(x.id))
    if (same.length === 1 && !alreadyByFull) found.set(p.id, p)
  }
  return [...found.values()]
}
export interface Prefilled { form: QuestionForm; values: Record<string, AnswerValue>; said: { count: number | null; audience: ReturnType<typeof audienceFrom>; names: string[] } }
/** The form with the people questions adjusted to what was said, and the answers that can be given for certain. */
export function prefillForm(form: QuestionForm, typed: string[], staff: PickerPerson[] | null): Prefilled {
  const all = typed.join('\n')
  const count = countFrom(all), audience = audienceFrom(all)
  const named = staff ? peopleNamed(all, staff) : []
  const values: Record<string, AnswerValue> = {}
  const questions: Question[] = form.questions.map(q0 => {
    if (q0.kind !== 'people') return q0
    // HOUSE RULE 9: how many people a question may take follows its kind (letters, pay and holiday decisions are always one), whatever was said or marked.
    const q = withMode(q0)
    const mode = peopleMode(q)
    const expected = mode === 'one' ? undefined : (q.expected ?? (count && count > 1 ? count : undefined))
    const next: Question = { ...q, ...(expected ? { expected } : {}) }
    // Names are filled in only when they can be used for certain: one name for a one person question; for a group, all the names they typed.
    if (named.length && !(mode === 'one' && named.length > 1)) values[q.id] = { text: '', people: named.slice(0, maxPeople(mode)).map(p => ({ id: p.id, name: p.name })) }
    return next
  })
  return { form: { ...form, questions }, values, said: { count, audience, names: named.map(p => p.name) } }
}
