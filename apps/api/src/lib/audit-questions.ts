// Audit question rules shared by the audit API, the report, the AI recommendations and WhatsApp.
// The web app keeps a matching copy in apps/web/src/lib/audit-questions.ts; change both together.

export const QUESTION_TYPES = [
  'yes_no', 'yes_no_na', 'findings', 'free_text', 'number', 'date', 'choice', 'multi_choice', 'rating',
] as const
export type QuestionType = typeof QUESTION_TYPES[number]

export type ChoiceOption = { label: string; fail?: boolean }
export type QuestionSettings = {
  allow_na?: boolean
  unit?: string; min?: number | null; max?: number | null      // number
  options?: ChoiceOption[]                                      // choice, multi_choice
  max_rating?: number; pass_min?: number | null                 // rating
}
export type ShowIf = { question_id: string; equals: string[] }

export type Outcome = 'pass' | 'fail' | 'na' | 'unanswered' | 'info'

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function isYesNo(type: string) { return type === 'yes_no' || type === 'yes_no_na' }
export function isNarrative(type: string) { return type === 'findings' || type === 'free_text' }

// Clean settings for a type, dropping anything that does not apply.
export function normaliseSettings(type: string, raw: any): QuestionSettings | null {
  const s: QuestionSettings = {}
  if (raw?.allow_na && !isYesNo(type) && !isNarrative(type)) s.allow_na = true
  if (type === 'number') {
    if (raw?.unit) s.unit = String(raw.unit).trim().slice(0, 20)
    const min = num(raw?.min), max = num(raw?.max)
    if (min !== null) s.min = min
    if (max !== null) s.max = max
  }
  if (type === 'choice' || type === 'multi_choice') {
    const seen = new Set<string>()
    s.options = (Array.isArray(raw?.options) ? raw.options : [])
      .map((o: any) => ({ label: String(typeof o === 'string' ? o : o?.label ?? '').trim().slice(0, 120), fail: !!(typeof o === 'object' && o?.fail) }))
      .filter((o: ChoiceOption) => o.label && !seen.has(o.label.toLowerCase()) && seen.add(o.label.toLowerCase()))
      .slice(0, 20)
  }
  if (type === 'rating') {
    const max = num(raw?.max_rating)
    s.max_rating = max && max >= 2 && max <= 10 ? Math.round(max) : 5
    const pass = num(raw?.pass_min)
    if (pass !== null) s.pass_min = Math.min(Math.max(1, Math.round(pass)), s.max_rating)
  }
  return Object.keys(s).length ? s : null
}

// The value a condition compares against: yes / no / na for yes-no questions, the chosen label(s) otherwise.
export function conditionValues(q: any, a: any): string[] {
  if (!a) return []
  if (a.answer_na) return ['na']
  if (isYesNo(q.question_type)) return a.answer_yn === true ? ['yes'] : a.answer_yn === false ? ['no'] : []
  if (q.question_type === 'multi_choice') return parseMulti(a.answer_value)
  return a.answer_value ? [String(a.answer_value)] : []
}

export function parseMulti(v: any): string[] {
  if (!v) return []
  try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr.map(String) : [] } catch { return [] }
}

// Whether a question is asked, given the answers so far. A question whose condition points at a
// question that is itself hidden is hidden too.
export function isVisible(q: any, byId: Map<string, any>, answers: Map<string, any>, depth = 0): boolean {
  const cond = q.show_if as ShowIf | null
  if (!cond?.question_id || !Array.isArray(cond.equals) || !cond.equals.length) return true
  const parent = byId.get(cond.question_id)
  if (!parent || depth > 10) return true
  if (!isVisible(parent, byId, answers, depth + 1)) return false
  const vals = conditionValues(parent, answers.get(parent.id))
  return vals.some(v => cond.equals.includes(v))
}

export function isAnswered(q: any, a: any): boolean {
  const t = q.question_type
  if (isNarrative(t)) return true
  if (!a) return false
  if (a.answer_na) return true
  if (isYesNo(t)) {
    if (a.answer_yn === true) return true
    if (a.answer_yn === false) return a.no_compliant === true || a.no_compliant === false
    return false
  }
  if (t === 'multi_choice') return parseMulti(a.answer_value).length > 0
  return a.answer_value !== null && a.answer_value !== undefined && String(a.answer_value).trim() !== ''
}

// Scoring: pass / fail for scored questions, info for questions with no pass rule.
export function outcomeFor(q: any, a: any): Outcome {
  const t = q.question_type
  const s: QuestionSettings = q.settings ?? {}
  if (isNarrative(t)) return 'info'
  if (!a) return 'unanswered'
  if (a.answer_na) return 'na'
  if (isYesNo(t)) {
    if (a.answer_yn === true) return 'pass'
    if (a.answer_yn === false) return a.no_compliant === true ? 'pass' : 'fail'
    return 'unanswered'
  }
  if (!isAnswered(q, a)) return 'unanswered'
  if (t === 'number') {
    const v = num(a.answer_value)
    if (v === null) return 'unanswered'
    if (s.min == null && s.max == null) return 'info'
    return (s.min != null && v < s.min) || (s.max != null && v > s.max) ? 'fail' : 'pass'
  }
  if (t === 'choice') {
    const opt = (s.options ?? []).find(o => o.label === a.answer_value)
    if (!(s.options ?? []).some(o => o.fail)) return 'info'
    return opt?.fail ? 'fail' : 'pass'
  }
  if (t === 'multi_choice') {
    if (!(s.options ?? []).some(o => o.fail)) return 'info'
    const picked = parseMulti(a.answer_value)
    return (s.options ?? []).some(o => o.fail && picked.includes(o.label)) ? 'fail' : 'pass'
  }
  if (t === 'rating') {
    if (s.pass_min == null) return 'info'
    const v = num(a.answer_value)
    return v !== null && v >= s.pass_min ? 'pass' : 'fail'
  }
  return 'info'
}

export function isScored(q: any): boolean {
  const t = q.question_type, s: QuestionSettings = q.settings ?? {}
  if (isYesNo(t)) return true
  if (t === 'number') return s.min != null || s.max != null
  if (t === 'choice' || t === 'multi_choice') return (s.options ?? []).some(o => o.fail)
  if (t === 'rating') return s.pass_min != null
  return false
}

// Human text for an answer, for reports, emails and the AI prompt.
export function answerText(q: any, a: any): string {
  const t = q.question_type
  const s: QuestionSettings = q.settings ?? {}
  if (!a) return 'Not answered'
  if (a.answer_na) return 'N/A'
  if (isYesNo(t)) return a.answer_yn === true ? 'Yes' : a.answer_yn === false ? 'No' : 'Not answered'
  if (t === 'multi_choice') { const p = parseMulti(a.answer_value); return p.length ? p.join(', ') : 'Not answered' }
  if (!a.answer_value) return isNarrative(t) ? '' : 'Not answered'
  if (t === 'number') return `${a.answer_value}${s.unit ? ` ${s.unit}` : ''}`
  if (t === 'rating') return `${a.answer_value} out of ${s.max_rating ?? 5}`
  if (t === 'date') {
    const d = new Date(String(a.answer_value))
    return isNaN(d.getTime()) ? String(a.answer_value) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return String(a.answer_value)
}

// Which of a template's questions belong on a run. While it is in progress: the current (active)
// questions, so an edit made mid-audit is picked up. Once completed: the questions it was answered
// against, plus any active question that already existed when it was completed.
export function questionsForRun(run: any, questions: any[]): any[] {
  if (run.status !== 'completed') return questions.filter(q => q.is_active)
  const answered = new Set((run.answers ?? []).map((a: any) => a.question_id))
  const completedAt = run.completed_at ? new Date(run.completed_at).getTime() : Date.now()
  return questions.filter(q => {
    if (answered.has(q.id)) return true
    if (!q.is_active) return false
    return !q.created_at || new Date(q.created_at).getTime() <= completedAt
  })
}

// Prisma include for a template's sections with ALL questions (filtered per run with questionsForRun).
export const SECTIONS_WITH_ALL_QUESTIONS = {
  sections: {
    orderBy: { section_order: 'asc' },
    include: { questions: { orderBy: { question_order: 'asc' } } },
  },
} as const

// Apply questionsForRun to a run loaded with SECTIONS_WITH_ALL_QUESTIONS, dropping empty sections.
export function shapeRunTemplate(run: any): any {
  if (!run?.template?.sections) return run
  const sections = run.template.sections
    .map((s: any) => ({ ...s, questions: questionsForRun(run, s.questions ?? []) }))
    .filter((s: any) => s.questions.length > 0)
  return { ...run, template: { ...run.template, sections } }
}

// The visible questions of a shaped run, given its answers.
export function visibleQuestions(run: any): any[] {
  const all = (run.template?.sections ?? []).flatMap((s: any) => s.questions)
  const byId = new Map<string, any>(all.map((q: any) => [q.id, q]))
  const answers = new Map<string, any>((run.answers ?? []).map((a: any) => [a.question_id, a]))
  return all.filter((q: any) => isVisible(q, byId, answers))
}

// The audit summary's deadline for actions is picked as a date (YYYY-MM-DD). Audits from before the
// date picker may hold free text, which is shown as it was typed.
export function actionsDeadlineLabel(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date(`${v}T00:00:00Z`)
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
