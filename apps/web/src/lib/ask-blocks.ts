// The two blocks every Ask CareStream agent may put in an answer (the house rules): a QUESTIONS block (a form, one labelled box per question) and an OPTIONS block (cards with a
// Preview and a Choose button). Pure functions, no screen code, so they are tested on their own. A block that cannot be read is NEVER shown half made: the answer is shown as
// plain text instead (the fences are taken off and the words kept), so a slip by the model never hides what it said.

export type QuestionKind = 'text' | 'longtext' | 'choice' | 'people' | 'date'
export interface Question { id: string; label: string; hint: string; required: boolean; kind: QuestionKind; choices: string[]; /** A people question: more than one person may be picked. Without it exactly ONE person. */ multiple?: boolean; /** How many people the administrator said (two employees of the month). A hint: they may choose more or fewer. */ expected?: number }
export interface QuestionForm { title: string; questions: Question[] }
export type PreviewKind = 'newsletter' | 'letter' | 'report' | 'notification' | 'email' | 'other'
export interface OptionItem { id: string; title: string; description: string; preview: { kind: PreviewKind; template_id: string | null; layout: string | null } }
export interface OptionSet { title: string; options: OptionItem[] }
export interface AnswerValue { text: string; people?: Array<{ id: string; name: string }> }

const KINDS: QuestionKind[] = ['text', 'longtext', 'choice', 'people', 'date']
const PREVIEW_KINDS: PreviewKind[] = ['newsletter', 'letter', 'report', 'notification', 'email', 'other']
export const MAX_QUESTIONS = 8, MAX_OPTIONS = 6
const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const slug = (v: unknown, fallback: string) => { const s = String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40); return s || fallback }

function fenced(text: string, tag: string): { raw: string; whole: string } | null {
  const m = new RegExp('```' + tag + '[ \\t]*\\r?\\n([\\s\\S]*?)```', 'i').exec(text ?? '')
  return m ? { raw: m[1], whole: m[0] } : null
}
/** The model's own words with a block taken out (when it was read) or with just the fences taken off (when it was not), so nothing it said is ever lost. */
function withoutBlock(text: string, tag: string, readable: boolean): string {
  const f = fenced(text, tag)
  if (!f) return String(text ?? '').trim()
  return String(text).replace(f.whole, readable ? '' : f.raw).replace(/\n{3,}/g, '\n\n').trim()
}

export function parseQuestions(text: string): QuestionForm | null {
  const f = fenced(text, 'questions')
  if (!f) return null
  let j: any
  try { j = JSON.parse(f.raw.trim()) } catch { return null }
  const list = Array.isArray(j) ? j : Array.isArray(j?.questions) ? j.questions : null
  if (!list) return null
  const seen = new Set<string>()
  const questions: Question[] = []
  for (const q of list.slice(0, MAX_QUESTIONS)) {
    const label = clip(q?.label, 220)
    if (!label) continue
    let id = slug(q?.id, `q${questions.length + 1}`)
    while (seen.has(id)) id += '_'
    seen.add(id)
    const kind: QuestionKind = KINDS.includes(q?.kind) ? q.kind : 'text'
    const choices = Array.isArray(q?.choices) ? q.choices.map((c: unknown) => clip(c, 80)).filter(Boolean).slice(0, 8) : []
    questions.push({ id, label, hint: clip(q?.hint, 220), required: q?.required === true, kind: kind === 'choice' && !choices.length ? 'text' : kind, choices, ...(kind === 'people' && (q?.multiple === true || Number(q?.expected) > 1) ? { multiple: true } : {}), ...(kind === 'people' && Number(q?.expected) >= 1 ? { expected: Math.min(20, Math.round(Number(q.expected))) } : {}) })
  }
  return questions.length ? { title: clip(j?.title, 100), questions } : null
}
export const withoutQuestionsBlock = (text: string) => withoutBlock(text, 'questions', parseQuestions(text) !== null)

export function parseOptions(text: string): OptionSet | null {
  const f = fenced(text, 'options')
  if (!f) return null
  let j: any
  try { j = JSON.parse(f.raw.trim()) } catch { return null }
  const list = Array.isArray(j) ? j : Array.isArray(j?.options) ? j.options : null
  if (!list) return null
  const seen = new Set<string>()
  const options: OptionItem[] = []
  for (const o of list.slice(0, MAX_OPTIONS)) {
    const title = clip(o?.title, 100)
    if (!title) continue
    let id = clip(o?.id, 80).replace(/[^a-zA-Z0-9_-]/g, '') || slug(title, `o${options.length + 1}`)
    while (seen.has(id)) id += '_'
    seen.add(id)
    const pk = String(o?.preview?.kind ?? '').toLowerCase() as PreviewKind
    const tid = clip(o?.preview?.template_id, 80).replace(/[^a-zA-Z0-9_-]/g, '')
    const lay = clip(o?.preview?.layout, 20).toLowerCase()
    options.push({ id, title, description: clip(o?.description, 200), preview: { kind: PREVIEW_KINDS.includes(pk) ? pk : 'other', template_id: tid || null, layout: ['short', 'standard', 'detailed'].includes(lay) ? lay : null } })
  }
  return options.length ? { title: clip(j?.title, 100), options } : null
}
export const withoutOptionsBlock = (text: string) => withoutBlock(text, 'options', parseOptions(text) !== null)

// ── Next step buttons (HOUSE RULE 7) ────────────────────────────────────────────────
// After an agent has produced anything it ends with a next_steps block: 3 to 5 buttons for the next stage, the most likely first (the primary button). An `ask` button sends a structured choice
// back to the agent (no typing), an `action` button runs a screen action (save, print, share, edit...) and a `link` opens a page. A "Something else" box is always there too.
export type NextKind = 'action' | 'ask' | 'link'
export const NEXT_ACTIONS = ['save_library', 'save_pdf', 'print', 'preview', 'edit', 'share', 'choose_who', 'send', 'back_to_layouts', 'show_working'] as const
export type NextAction = (typeof NEXT_ACTIONS)[number]
export interface NextStep { id: string; label: string; kind: NextKind; payload: string | null }
export interface NextSteps { steps: NextStep[] }
export const MAX_NEXT = 5
export function parseNextSteps(text: string): NextSteps | null {
  const f = fenced(text, 'next_steps')
  if (!f) return null
  let j: any
  try { j = JSON.parse(f.raw.trim()) } catch { return null }
  const list = Array.isArray(j) ? j : Array.isArray(j?.steps) ? j.steps : Array.isArray(j?.next_steps) ? j.next_steps : null
  if (!list) return null
  const seen = new Set<string>(), steps: NextStep[] = []
  for (const x of list.slice(0, MAX_NEXT)) {
    const label = clip(x?.label, 60); if (!label) continue
    let kind: NextKind = x?.kind === 'action' || x?.kind === 'link' ? x.kind : 'ask'
    let payload = x?.payload == null ? null : clip(x.payload, 300) || null
    if (kind === 'action' && !(NEXT_ACTIONS as readonly string[]).includes(String(payload))) kind = 'ask'   // an action the screen does not know becomes a plain ask
    if (kind === 'link' && !/^\/[a-zA-Z0-9/_?=&#.-]*$/.test(payload ?? '')) kind = 'ask'              // only our own pages, never an outside address
    let id = clip(x?.id, 60).replace(/[^a-zA-Z0-9_-]/g, '') || slug(label, `n${steps.length + 1}`)
    while (seen.has(id)) id += '_'
    seen.add(id); steps.push({ id, label, kind, payload })
  }
  return steps.length ? { steps } : null
}
export const withoutNextStepsBlock = (text: string) => withoutBlock(text, 'next_steps', parseNextSteps(text) !== null)
export const NEXT_MARK = '[next]'
/** What an `ask` button (or the "Something else" box) sends back: a short structured message, so nothing is typed and nothing is ambiguous. */
export const formatNext = (s: { id: string; label: string; payload?: string | null }) => `${NEXT_MARK} I choose: ${s.label} (id ${s.id})${s.payload ? `. ${s.payload}` : '.'}`
export const formatSomethingElse = (text: string) => `${NEXT_MARK} Something else: ${String(text ?? '').trim().slice(0, 600)}`
export function parseNextMessage(content: string): { label: string } | null {
  const t = String(content ?? '').trim()
  const a = /^\[next\]\s+I choose:\s+(.+?)\s+\(id\s+[A-Za-z0-9_-]+\)/.exec(t); if (a) return { label: a[1] }
  const b = /^\[next\]\s+Something else:\s+([\s\S]+)$/.exec(t); return b ? { label: b[1].trim() } : null
}
/** An answer with the blocks taken out, for showing. */
export const visibleText = (text: string) => withoutNextStepsBlock(withoutOptionsBlock(withoutQuestionsBlock(text)))

// ── Answering ───────────────────────────────────────────────────────────────────────
/** Which required questions have no answer. A people question is answered ONLY by picking from the staff list (a typed name is never a guess the agent has to resolve). */
export function missingAnswers(form: QuestionForm, values: Record<string, AnswerValue>): string[] {
  return form.questions.filter(q => q.required && (q.kind === 'people' ? !(values[q.id]?.people?.length) : !(values[q.id]?.text ?? '').trim())).map(q => q.id)
}
export const ANSWERS_MARK = '[answers]'
export const CHOICE_MARK = '[choice]'
export const IDS_MARK = 'Staff ids:'
/** The one message the answers go back as. Each question is paired with its answer, so there is nothing to guess. A question left empty says so. */
export function formatAnswers(form: QuestionForm, values: Record<string, AnswerValue>): string {
  const lines = [`${ANSWERS_MARK}${form.title ? ' ' + form.title : ''}`]
  form.questions.forEach((q, i) => {
    const v = values[q.id]
    const picked = q.kind === 'people' ? (v?.people ?? []).slice(0, q.multiple ? 500 : 1) : []
    const typed = q.kind === 'people' ? '' : (v?.text ?? '').trim()
    const answer = [picked.map(p => p.name).join(', '), typed].filter(Boolean).join('; ') || '(no answer)'
    lines.push(`${i + 1}. ${q.label}`, `   Answer: ${answer}`)
    // The staff ids travel in the message so the agent can use them in its tools; they are never shown (the answered card drops this line).
    if (picked.length) lines.push(`   ${IDS_MARK} ${picked.map(p => p.id).join(', ')}`)
  })
  return lines.join('\n')
}
/** A message that is an answers message, read back into question and answer pairs for the answered card. Anything else gives null. */
export function parseAnswersMessage(content: string): { title: string; pairs: Array<{ question: string; answer: string }> } | null {
  const lines = String(content ?? '').split(/\r?\n/)
  if (!lines[0]?.startsWith(ANSWERS_MARK)) return null
  const pairs: Array<{ question: string; answer: string }> = []
  for (let i = 1; i < lines.length; i++) {
    const q = /^\d+\.\s+(.+)$/.exec(lines[i]); const a = /^\s+Answer:\s*(.*)$/.exec(lines[i + 1] ?? '')
    if (q && a) { pairs.push({ question: q[1], answer: a[1] }); i++; if (new RegExp('^\\s+' + IDS_MARK).test(lines[i + 1] ?? '')) i++ }
  }
  return pairs.length ? { title: lines[0].slice(ANSWERS_MARK.length).trim(), pairs } : null
}
export const formatChoice = (o: OptionItem) => `${CHOICE_MARK} I choose: ${o.title} (id ${o.id}).`
export function parseChoiceMessage(content: string): { title: string; id: string } | null {
  const m = /^\[choice\]\s+I choose:\s+(.+?)\s+\(id\s+([A-Za-z0-9_-]+)\)\.?\s*$/.exec(String(content ?? '').trim())
  return m ? { title: m[1], id: m[2] } : null
}
