// HOUSE RULE 9, A GENTLE CHECK ON UNEXPECTED CHOICES. When what the administrator picks or types differs from what they said (or from what the agent expected), the form does not
// block and does not silently accept: it shows ONE LINE with buttons before anything is sent ("You have chosen 2 people. Is this two employees of the month?"). Accepting keeps the
// choice and the agent adapts (plural wording, a consent and a picture for each person, a gift for each or shared); declining puts the form back to what was expected.
// Everything here is plain code that decides from the administrator's own words and their choices. It never depends on the model, so it is the same every time and is tested on its own.
import type { AnswerValue, OptionItem, OptionSet, Question, QuestionForm } from '@/lib/ask-blocks'
import type { PickerPerson } from '@/lib/staff-picker'

export type PeopleMode = 'one' | 'some' | 'many'
/** Where the same question is asked with two or more people the "some" kinds allow this many (a shared award, a few new starters). */
export const SOME_MAX = 12

/** Questions where a wrong second name could send or change something for the wrong person: exactly one, whatever the agent says. */
const RISKY = /\b(letters?|pay\s+review|pay\s+rise|pay\s+rate|salary|wages?|holiday\s+(?:request|decision|approval|booking)|approv(?:e|al)|reject|disciplin\w*|warnings?|probation|reference|contract|dismiss\w*|remove|archive|one\s+named|named\s+person|about\s+(?:one|this|a\s+single)\s+(?:person|member|staff)|a\s+single\s+(?:person|member))\b/i
/** Recognition style questions: a small group is normal (a shared award, a few new starters, a few leavers). */
const RECOGNITION = /\b(employees?\s+of\s+the\s+month|star\s+of\s+the\s+month|stars?\s+of\s+the\s+month|staff\s+stor\w+|recogni\w+|thank(?:s|ing|ed)?(?:[\s-]?yous?)?|well\s+done|award\w*|nominee\w*|winners?|welcome|new\s+starters?|starters?|starting|joining|leav(?:ers?|ing)|farewell|achievement\w*|birthday\w*|anniversar\w+|celebrat\w+|team\s+members?|colleagues?)\b/i
/** Questions that are about a group of any size: who gets a message, who is allocated a course. */
const MANY = /\b(allocat\w+|assign\w*|training|courses?|recipients?|notif\w+|who\s+(?:gets|should\s+get|receives|is\s+it\s+for)|send\s+(?:it\s+)?to|selected\s+staff|reminders?)\b/i

const textOf = (q: Pick<Question, 'id' | 'label' | 'hint'>) => `${q.id} ${q.label} ${q.hint ?? ''}`
export const isRisky = (q: Pick<Question, 'id' | 'label' | 'hint'>) => RISKY.test(textOf(q))

/** How many people one people question may take. Risky questions are ALWAYS one (even if the agent said otherwise); an explicit mode from the agent is used next;
 *  an older "multiple" means any number; recognition questions take a small group; a question about a group takes any number; anything else is one. */
export function peopleMode(q: Pick<Question, 'id' | 'label' | 'hint'> & { mode?: PeopleMode; multiple?: boolean }): PeopleMode {
  if (isRisky(q)) return 'one'
  if (q.mode === 'one' || q.mode === 'some' || q.mode === 'many') return q.mode
  if (q.multiple === true) return 'many'
  const t = textOf(q)
  if (RECOGNITION.test(t)) return 'some'
  if (MANY.test(t)) return 'many'
  return 'one'
}
export const maxPeople = (mode: PeopleMode) => (mode === 'one' ? 1 : mode === 'some' ? SOME_MAX : 500)

/** A people question made to follow its mode (how many may be ticked). The agent's wish to allow more is ignored for risky questions. */
export function withMode(q: Question): Question {
  if (q.kind !== 'people') return q
  const mode = peopleMode(q)
  const { multiple: _m, ...rest } = q
  return { ...rest, mode, ...(mode === 'one' ? { expected: undefined } : { multiple: true }) } as Question
}

// ── words ───────────────────────────────────────────────────────────────────────────────────────────────────────
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
export const numberWord = (n: number) => (n >= 0 && n <= 10 ? NUM[n] : String(n))
/** "employee of the month" from "Who is the employee of the month?"; "people" when there is no clear noun. */
export function nounFrom(label: string): string {
  const m = /^\s*who\s+(?:is|are|was|were)\s+(?:the\s+|our\s+|your\s+)?(.+?)\s*\??\s*$/i.exec(String(label ?? ''))
  const n = (m ? m[1] : '').trim().toLowerCase()
  return n && n.split(' ').length <= 6 ? n : 'people'
}
/** employee of the month, 2 gives employees of the month. */
export function plural(noun: string): string {
  if (noun === 'people') return noun
  const w = noun.split(' ')
  w[0] = /(s|x|ch|sh)$/.test(w[0]) ? w[0] + 'es' : /[^aeiou]y$/.test(w[0]) ? w[0].slice(0, -1) + 'ies' : w[0] + 's'
  return w.join(' ')
}

// ── the checks ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface SaidIn { count: number | null; audience: { kind: 'all' } | { kind: 'team'; team: string } | null; names: string[] }
export type CheckKind = 'people_more' | 'people_fewer' | 'people_all' | 'people_few' | 'date_past' | 'template'
export interface CheckItem {
  /** Changes whenever the thing being checked changes, so a changed choice is asked about again and a confirmed one is never asked twice. */
  id: string
  qid: string
  kind: CheckKind
  text: string
  yes: string
  no: string
  /** What the check was about, written into the answers when it was confirmed (the agent adapts to it). */
  note: string
}
const sig = (ids: string[]) => [...ids].sort().join('|')

/** The count the administrator expects for a people question: a number they said (to the agent in the question, or in chat), else the names they typed, else one for the small group kinds. Null when no count is expected (a group of any size). */
export function expectedCount(q: Question, said: SaidIn): number | null {
  const mode = peopleMode(q)
  if (mode === 'one') return 1
  if (q.expected && q.expected >= 1) return q.expected
  if (said.count && said.count >= 1) return said.count
  if (said.names.length > 0) return said.names.length
  return mode === 'some' ? 1 : null
}

/** The one line check for a people question, or null when the choice matches what was said. staffTotal is how many active staff the account has. */
export function peopleCheck(q: Question, chosen: Array<{ id: string }>, said: SaidIn, staffTotal: number | null): CheckItem | null {
  const mode = peopleMode(q)
  const n = chosen.length
  if (mode === 'one' || n === 0) return null
  const s = sig(chosen.map(p => p.id))
  const noun = nounFrom(q.label)
  const exp = expectedCount(q, said)
  if (exp !== null && n !== exp) {
    if (n > exp) {
      return { id: `${q.id}:more:${exp}:${s}`, qid: q.id, kind: 'people_more', text: `You have chosen ${n} people. Is this ${numberWord(n)} ${noun === 'people' ? 'people' : plural(noun)}?`,
        yes: `Yes, ${numberWord(n)}`, no: exp === 1 ? 'No, just one' : `No, ${numberWord(exp)}`, note: `confirmed ${n} people` }
    }
    return { id: `${q.id}:fewer:${exp}:${s}`, qid: q.id, kind: 'people_fewer', text: `You said ${numberWord(exp)}, but chose ${numberWord(n)}. Is that right?`,
      yes: n === 1 ? 'Yes, just one' : `Yes, ${numberWord(n)}`, no: `Choose ${numberWord(exp)}`, note: `confirmed ${n} people` }
  }
  if (mode === 'many' && exp === null && staffTotal && staffTotal >= 4) {
    if (said.audience?.kind === 'all' && n < staffTotal) {
      return { id: `${q.id}:few:${s}`, qid: q.id, kind: 'people_few', text: `You said everyone, but chose ${n} of ${staffTotal}. Is that right?`, yes: `Yes, just these ${n}`, no: 'Choose everyone', note: `confirmed ${n} of ${staffTotal} people` }
    }
    if (!said.audience && n === staffTotal) {
      return { id: `${q.id}:all:${s}`, qid: q.id, kind: 'people_all', text: `You have chosen all ${staffTotal} staff. Is that right?`, yes: 'Yes, everyone', no: 'Change it', note: `confirmed all ${staffTotal} staff` }
    }
  }
  return null
}

/** What a declined check does to the answer: the form goes back to what was expected. */
export function declineValue(item: CheckItem, value: AnswerValue, q: Question, said: SaidIn, staff: PickerPerson[] | null): AnswerValue {
  const people = value.people ?? []
  switch (item.kind) {
    case 'people_more': { const keep = expectedCount(q, said) ?? 1; return { ...value, people: people.slice(0, keep) } }
    case 'people_fewer': return value                                                      // they choose another; the picker stays as it is
    case 'people_few': return { ...value, people: (staff ?? []).map(p => ({ id: p.id, name: p.name })) }
    case 'people_all': return { ...value, people: [] }
    case 'date_past': return { ...value, text: '' }
    default: return value
  }
}

// ── dates ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A date question that is about a day still to come (a deadline, a closing date, when something goes out). Dates of the past (a start date, a birthday) are never checked. */
const FUTURE_DATE = /\b(by\s+when|deadline|due|closing|close|going\s+out|send\s+(?:on|date)|publish|nominat\w+|event|meeting|until|reminder)\b/i
const PAST_DATE = /\b(birth|joined|started|since|last|previous|was|ago|first\s+day|dob)\b/i
export function dateCheck(q: Question, value: AnswerValue, today: string): CheckItem | null {
  if (q.kind !== 'date') return null
  const d = (value.text ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d >= today) return null
  const t = textOf(q)
  if (!FUTURE_DATE.test(t) || PAST_DATE.test(t)) return null
  const shown = new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { id: `${q.id}:past:${d}`, qid: q.id, kind: 'date_past', text: `That date, ${shown}, has already gone. Is that right?`, yes: 'Yes, it is', no: 'Change it', note: `confirmed a date in the past (${d})` }
}

/** Every check a form needs right now. Questions where the choice matches what was said give nothing. */
export function checksFor(form: QuestionForm, values: Record<string, AnswerValue>, said: SaidIn, staffTotal: number | null, today: string): CheckItem[] {
  const out: CheckItem[] = []
  for (const q of form.questions) {
    const v = values[q.id]
    if (!v) continue
    const c = q.kind === 'people' ? peopleCheck(q, v.people ?? [], said, staffTotal) : q.kind === 'date' ? dateCheck(q, v, today) : null
    if (c) out.push(c)
  }
  return out
}
/** The checks still to be answered (the ones not yet confirmed). A confirmed check is never asked again for the same choice. */
export const pendingChecks = (all: CheckItem[], confirmed: Record<string, string>) => all.filter(c => !(c.id in confirmed))

// ── options: a different template from the one they asked for ──────────────────────────────────────────────────
const norm = (s: string) => ` ${String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `
/** They typed a template name that is one of the options, then chose a different option. Layout names (short, standard, detailed) never trigger it because nobody types them as a template name. */
export function templateCheck(typed: string[], chosen: OptionItem, set: OptionSet): CheckItem | null {
  const said = norm(typed.join(' '))
  const named = set.options.filter(o => o.title.trim().split(/\s+/).length >= 2 && said.includes(norm(o.title)))
  if (!named.length || named.some(o => o.id === chosen.id)) return null
  return { id: `template:${chosen.id}`, qid: 'template', kind: 'template', text: `You asked for ${named[0].title}. Is ${chosen.title} what you want?`, yes: `Yes, use ${chosen.title}`, no: 'Choose another', note: `confirmed ${chosen.title}` }
}
