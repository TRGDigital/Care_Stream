// The two blocks every Ask CareStream agent may put in an answer (the house rules): a QUESTIONS block (a form, one labelled box per question) and an OPTIONS block (cards with a
// Preview and a Choose button). Pure functions, no screen code, so they are tested on their own. A block that cannot be read is NEVER shown half made: the answer is shown as
// plain text instead (the fences are taken off and the words kept), so a slip by the model never hides what it said.

export type QuestionKind = 'text' | 'longtext' | 'choice' | 'people' | 'date'
export interface Question { id: string; label: string; hint: string; required: boolean; kind: QuestionKind; choices: string[] }
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
    questions.push({ id, label, hint: clip(q?.hint, 220), required: q?.required === true, kind: kind === 'choice' && !choices.length ? 'text' : kind, choices })
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
/** An answer with both blocks taken out, for showing. */
export const visibleText = (text: string) => withoutOptionsBlock(withoutQuestionsBlock(text))

// ── Answering ───────────────────────────────────────────────────────────────────────
/** Which required questions have no answer. A people question counts as answered when someone is picked or a name is typed. */
export function missingAnswers(form: QuestionForm, values: Record<string, AnswerValue>): string[] {
  return form.questions.filter(q => q.required && !(values[q.id]?.text ?? '').trim() && !(values[q.id]?.people?.length)).map(q => q.id)
}
export const ANSWERS_MARK = '[answers]'
export const CHOICE_MARK = '[choice]'
/** The one message the answers go back as. Each question is paired with its answer, so there is nothing to guess. A question left empty says so. */
export function formatAnswers(form: QuestionForm, values: Record<string, AnswerValue>): string {
  const lines = [`${ANSWERS_MARK}${form.title ? ' ' + form.title : ''}`]
  form.questions.forEach((q, i) => {
    const v = values[q.id]
    const names = (v?.people ?? []).map(p => `${p.name} (staff id ${p.id})`).join(', ')
    const typed = (v?.text ?? '').trim()
    const answer = [names, typed].filter(Boolean).join('; ') || '(no answer)'
    lines.push(`${i + 1}. ${q.label}`, `   Answer: ${answer}`)
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
    if (q && a) { pairs.push({ question: q[1], answer: a[1] }); i++ }
  }
  return pairs.length ? { title: lines[0].slice(ANSWERS_MARK.length).trim(), pairs } : null
}
export const formatChoice = (o: OptionItem) => `${CHOICE_MARK} I choose: ${o.title} (id ${o.id}).`
export function parseChoiceMessage(content: string): { title: string; id: string } | null {
  const m = /^\[choice\]\s+I choose:\s+(.+?)\s+\(id\s+([A-Za-z0-9_-]+)\)\.?\s*$/.exec(String(content ?? '').trim())
  return m ? { title: m[1], id: m[2] } : null
}
