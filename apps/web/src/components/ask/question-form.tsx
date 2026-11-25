'use client'

// HOUSE RULE 1: when an agent needs information it asks in a form, not in a paragraph. Each question has its own labelled box with a free text field (a choice question also
// offers quick buttons, a people question also offers the staff picker), a short hint, and "required" or "optional". One Send answers button sends every answer back as one
// message that pairs each question with its answer, so nothing is ambiguous. The form stays editable until it is sent; after that the answered card shows what was sent.
import { useId, useMemo, useState } from 'react'
import { Check, Loader2, Send } from 'lucide-react'
import { StaffPicker, useStaff } from '@/components/ask/staff-picker'
import { prefillForm } from '@/lib/ask-prefill'
import { formatAnswers, missingAnswers, type AnswerValue, type Question, type QuestionForm as Form } from '@/lib/ask-blocks'

const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

/** HOUSE RULE 3: a people question is a LIST of the account's staff with their pictures. Exactly one person unless the agent said several. There is no free text box for a name. */
function PeopleField({ token, q, value, onChange, disabled, boxId }: { token: string; q: Question; value: AnswerValue; onChange: (v: AnswerValue) => void; disabled: boolean; boxId: string }) {
  const staff = useStaff(token)
  const ids = (value.people ?? []).map(p => p.id)
  const multiple = q.multiple === true
  const pick = (list: string[]) => onChange({ ...value, text: '', people: (staff ?? []).filter(p => list.includes(p.id)).map(p => ({ id: p.id, name: p.name })).slice(0, multiple ? 500 : 1) })
  return (
    <div id={boxId} aria-describedby={`${boxId}-hint`}>
      {staff === null
        ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
        : <StaffPicker people={staff} selected={ids} onChange={pick} mode={multiple ? 'multi' : 'single'} disabled={disabled} label={q.label} bulk={multiple} />}
      {q.expected && q.expected > 1 && <p className="mt-1.5 text-xs text-neutral-mid">You said {q.expected}: choose {q.expected} people (you can choose more or fewer).</p>}
      {(value.people ?? []).length > 0 && <p className="mt-1.5 text-xs font-medium text-neutral-dark" aria-live="polite">Chosen: {(value.people ?? []).map(p => p.name).join(', ')}</p>}
    </div>
  )
}

export function QuestionFormCard({ token, form: given, typed = [], disabled, onSend }: { token: string; form: Form; /** What the administrator has typed so far in this chat: used to fill in what they have already said (HOUSE RULE 8). */ typed?: string[]; disabled?: boolean; onSend: (message: string) => void }) {
  const uid = useId()
  const staffForHints = useStaff(token, given.questions.some(q => q.kind === 'people'))
  const pre = useMemo(() => prefillForm(given, typed, staffForHints), [given, typed.join('\n'), staffForHints])   // eslint-disable-line react-hooks/exhaustive-deps
  const form = pre.form
  const [edited, setEdited] = useState<Record<string, AnswerValue>>({})
  const values = useMemo(() => ({ ...pre.values, ...edited }), [pre.values, edited])
  const setValues = (f: (s: Record<string, AnswerValue>) => Record<string, AnswerValue>) => setEdited(e => f({ ...pre.values, ...e }))
  const [tried, setTried] = useState(false)
  const set = (id: string, v: AnswerValue) => setValues(s => ({ ...s, [id]: v }))
  const missing = missingAnswers(form, values)
  function send() { setTried(true); if (missing.length) return; onSend(formatAnswers(form, values)) }
  return (
    <form onSubmit={e => { e.preventDefault(); send() }} className="mt-3 rounded-xl border border-teal/30 bg-teal/5 p-3 sm:p-4" aria-label={form.title || 'Questions for you'}>
      {form.title && <p className="mb-2 text-sm font-semibold text-neutral-dark">{form.title}</p>}
      <div className="space-y-3">
        {form.questions.map(q => {
          const id = `${uid}-${q.id}`; const v = values[q.id] ?? { text: '' }
          const bad = tried && missing.includes(q.id)
          return (
            <div key={q.id}>
              <label htmlFor={id} className="block text-sm font-medium text-neutral-dark">{q.label} <span className={`text-xs font-normal ${q.required ? 'text-red-700' : 'text-neutral-mid'}`}>{q.required ? '(required)' : '(optional)'}</span></label>
              {q.hint && <p id={`${id}-hint`} className="mb-1 text-xs text-neutral-mid">{q.hint}</p>}
              {q.kind === 'longtext' ? <textarea id={id} rows={3} className={`${inp} resize-y`} value={v.text} disabled={disabled} onChange={e => set(q.id, { ...v, text: e.target.value })} aria-invalid={bad} aria-describedby={q.hint ? `${id}-hint` : undefined} />
                : q.kind === 'date' ? <input id={id} type="date" className={`${inp} sm:w-auto`} value={v.text} disabled={disabled} onChange={e => set(q.id, { ...v, text: e.target.value })} aria-invalid={bad} />
                : q.kind === 'people' ? <PeopleField token={token} q={q} value={v} onChange={nv => set(q.id, nv)} disabled={!!disabled} boxId={id} />
                : <>
                  {q.kind === 'choice' && <div className="mb-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`Quick answers for: ${q.label}`}>{q.choices.map(c => <button key={c} type="button" disabled={disabled} onClick={() => set(q.id, { ...v, text: c })} aria-pressed={v.text === c} className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 text-xs font-semibold ${v.text === c ? 'border-teal bg-teal text-white' : 'border-gray-300 bg-white text-neutral-dark hover:border-teal'}`}>{v.text === c && <Check size={12} aria-hidden="true" />}{c}</button>)}</div>}
                  <input id={id} className={inp} value={v.text} disabled={disabled} onChange={e => set(q.id, { ...v, text: e.target.value })} aria-invalid={bad} aria-describedby={q.hint ? `${id}-hint` : undefined} placeholder={q.kind === 'choice' ? 'Or type your own answer' : undefined} />
                </>}
              {bad && <p role="alert" className="mt-1 text-xs font-medium text-red-700">Please answer this one.</p>}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={disabled} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><Send size={14} aria-hidden="true" />Send answers</button>
        {tried && missing.length > 0 && <span role="alert" className="text-xs font-medium text-red-700">{missing.length === 1 ? 'One required answer is missing.' : `${missing.length} required answers are missing.`}</span>}
      </div>
    </form>
  )
}

/** What was sent: the questions with their answers, read only. */
export function AnsweredCard({ title, pairs }: { title: string; pairs: Array<{ question: string; answer: string }> }) {
  return (
    <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-teal px-4 py-3 text-white" aria-label="Your answers">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/80"><Check size={12} aria-hidden="true" />{title || 'Your answers'}</p>
      <dl className="space-y-1.5 text-sm">{pairs.map((p, i) => <div key={i}><dt className="text-xs text-white/80">{p.question}</dt><dd className="font-medium">{p.answer}</dd></div>)}</dl>
    </div>
  )
}
