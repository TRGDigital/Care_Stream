'use client'

// HOUSE RULE 1: when an agent needs information it asks in a form, not in a paragraph. Each question has its own labelled box with a free text field (a choice question also
// offers quick buttons, a people question also offers the staff picker), a short hint, and "required" or "optional". One Send answers button sends every answer back as one
// message that pairs each question with its answer, so nothing is ambiguous. The form stays editable until it is sent; after that the answered card shows what was sent.
import { DatePicker } from '@/components/ask/date-picker'
import { useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Loader2, Send } from 'lucide-react'
import { StaffPicker, useStaff } from '@/components/ask/staff-picker'
import { ask } from '@/lib/ask-client'
import { prefillForm } from '@/lib/ask-prefill'
import { formatAnswers, missingAnswers, type AnswerValue, type Question, type QuestionForm as Form } from '@/lib/ask-blocks'
import { checksFor, declineValue, maxPeople, peopleMode, pendingChecks, type CheckItem } from '@/lib/ask-check'

/** The same words once the case, punctuation and an (optional) tag are ignored: a title that is just the first question is not shown twice (HOUSE RULE 14). */
export const sameWords = (a?: string, b?: string) => { const n = (t?: string) => String(t ?? '').toLowerCase().replace(/\((optional|required)\)/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); return !!n(a) && n(a) === n(b) }

const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

/** HOUSE RULE 3: a people question is a LIST of the account's staff with their pictures. Exactly one person unless the agent said several. There is no free text box for a name. */
function PeopleField({ token, q, value, onChange, disabled, boxId }: { token: string; q: Question; value: AnswerValue; onChange: (v: AnswerValue) => void; disabled: boolean; boxId: string }) {
  const staff = useStaff(token)
  const ids = (value.people ?? []).map(p => p.id)
  const mode = peopleMode(q)                                    // HOUSE RULE 9: one, some (a small group) or many
  const multiple = mode !== 'one'
  const pick = (list: string[]) => onChange({ ...value, text: '', people: (staff ?? []).filter(p => list.includes(p.id)).map(p => ({ id: p.id, name: p.name })).slice(0, maxPeople(mode)) })
  return (
    <div id={boxId} aria-describedby={`${boxId}-hint`}>
      {staff === null
        ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
        : <StaffPicker people={staff} selected={ids} onChange={pick} mode={multiple ? 'multi' : 'single'} disabled={disabled} label={q.label} bulk={mode === 'many'} />}
      {multiple && q.expected && q.expected > 1 && <p className="mt-1.5 text-xs text-neutral-mid">You said {q.expected}: choose {q.expected} people (you can choose more or fewer).</p>}
      {(value.people ?? []).length > 0 && <p className="mt-1.5 text-xs font-medium text-neutral-dark" aria-live="polite">Chosen: {(value.people ?? []).map(p => p.name).join(', ')}</p>}
    </div>
  )
}

/** An optional picture (the gift): a small file picker that uploads straight away. The id travels with the answers and is never shown. */
function ImageField({ token, value, onChange, disabled, boxId }: { token: string; value: AnswerValue; onChange: (v: AnswerValue) => void; disabled: boolean; boxId: string }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function pick(f: File | undefined) {
    if (!f) return
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 1024 * 1024) { setErr('Use a png, jpg or webp picture up to 1 MB.'); return }
    setBusy(true); setErr('')
    try { const r = await ask.giftImage(token, f); onChange({ ...value, imageId: r.image_id, imageName: f.name }) } catch (e) { setErr(e instanceof Error ? e.message : 'That picture could not be added.') } finally { setBusy(false) }
  }
  return (
    <div>
      <input id={boxId} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || busy} onChange={e => pick(e.target.files?.[0])} className="block w-full text-sm text-neutral-dark file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" aria-describedby={`${boxId}-hint`} />
      {busy && <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Adding the picture</p>}
      {value.imageId && <p className="mt-1 text-xs font-medium text-green-800">Added: {value.imageName ?? 'a picture'} <button type="button" className="ml-2 font-semibold underline" onClick={() => onChange({ ...value, imageId: null, imageName: null })}>Remove</button></p>}
      {err && <p role="alert" className="mt-1 text-xs text-red-700">{err}</p>}
    </div>
  )
}

/** HOUSE RULE 9: one line, plainly what we see, and buttons. Never a warning, never repeated once answered. */
export function CheckLine({ item, onYes, onNo, disabled }: { item: CheckItem; onYes: () => void; onNo: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} role="group" aria-label="A quick check" data-check={item.kind} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
      <p className="text-sm text-neutral-dark" role="status" aria-live="polite">{item.text}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={disabled} onClick={onYes} data-check-yes className="min-h-[34px] rounded-lg bg-teal px-3 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{item.yes}</button>
        <button type="button" disabled={disabled} onClick={onNo} className="min-h-[34px] rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-neutral-dark hover:bg-gray-50 disabled:opacity-50">{item.no}</button>
      </div>
    </div>
  )
}

export function QuestionFormCard({ token, form: given, typed = [], disabled, onSend, onBack }: { token: string; form: Form; /** HOUSE RULE 14: go back to where they were before (the screen supplies it; nothing is final until they send). */ onBack?: () => void; /** What the administrator has typed so far in this chat: used to fill in what they have already said (HOUSE RULE 8). */ typed?: string[]; disabled?: boolean; onSend: (message: string) => void }) {
  const uid = useId()
  const staffForHints = useStaff(token, given.questions.some(q => q.kind === 'people'))
  const pre = useMemo(() => prefillForm(given, typed, staffForHints), [given, typed.join('\n'), staffForHints])   // eslint-disable-line react-hooks/exhaustive-deps
  const form = pre.form
  const [edited, setEdited] = useState<Record<string, AnswerValue>>({})
  const values = useMemo(() => ({ ...pre.values, ...edited }), [pre.values, edited])
  const setValues = (f: (s: Record<string, AnswerValue>) => Record<string, AnswerValue>) => setEdited(e => f({ ...pre.values, ...e }))
  const [tried, setTried] = useState(false)
  // HOUSE RULE 9: the one line checks. A confirmed check is remembered for that choice, so it is never asked twice; a changed choice is asked about again.
  const [confirmed, setConfirmed] = useState<Record<string, string>>({})
  const today = new Date().toISOString().slice(0, 10)
  const checks = useMemo(() => checksFor(form, values, pre.said, staffForHints ? staffForHints.length : null, today), [form, values, pre.said, staffForHints, today])
  const pending = pendingChecks(checks, confirmed)
  const rootRef = useRef<HTMLFormElement>(null)
  const set = (id: string, v: AnswerValue) => setValues(s => ({ ...s, [id]: v }))
  const missing = missingAnswers(form, values)
  function send() {
    setTried(true)
    if (missing.length) return
    if (pending.length) { rootRef.current?.querySelector<HTMLButtonElement>('[data-check-yes]')?.focus(); return }   // answer the quick check first (nothing is blocked: one click)
    const notes: Record<string, string> = {}
    for (const c of checks) if (confirmed[c.id]) notes[c.qid] = confirmed[c.id]
    onSend(formatAnswers(form, values, notes))
  }
  const yes = (c: CheckItem) => setConfirmed(m => ({ ...m, [c.id]: c.note }))
  const no = (c: CheckItem) => { const q = form.questions.find(x => x.id === c.qid); if (q) set(q.id, declineValue(c, values[q.id] ?? { text: '' }, q, pre.said, staffForHints)) }
  return (
    <form ref={rootRef} onSubmit={e => { e.preventDefault(); send() }} className="mt-3 rounded-xl border border-teal/30 bg-teal/5 p-3 sm:p-4" aria-label={form.title || 'Questions for you'}>
      {form.title && !sameWords(form.title, form.questions[0]?.label) && <p className="mb-2 text-sm font-semibold text-neutral-dark">{form.title}</p>}   {/* HOUSE RULE 14: said once. When the title is the first question, only the question shows. */}
      <div className="space-y-3">
        {form.questions.map(q => {
          const id = `${uid}-${q.id}`; const v = values[q.id] ?? { text: '' }
          const bad = tried && missing.includes(q.id)
          return (
            <div key={q.id}>
              <label htmlFor={id} className="block text-sm font-medium text-neutral-dark">{q.label} <span className={`text-xs font-normal ${q.required ? 'text-red-700' : 'text-neutral-mid'}`}>{q.required ? '(required)' : '(optional)'}</span></label>
              {q.hint && <p id={`${id}-hint`} className="mb-1 text-xs text-neutral-mid">{q.hint}</p>}
              {q.kind === 'longtext' ? <textarea id={id} rows={3} className={`${inp} resize-y`} value={v.text} disabled={disabled} onChange={e => set(q.id, { ...v, text: e.target.value })} aria-invalid={bad} aria-describedby={q.hint ? `${id}-hint` : undefined} />
                : q.kind === 'date' ? <DatePicker id={id} label={q.label} value={v.text} disabled={disabled} onChange={iso => set(q.id, { ...v, text: iso })} />
                : q.kind === 'image' ? <ImageField token={token} value={v} onChange={nv => set(q.id, nv)} disabled={!!disabled} boxId={id} />
                : q.kind === 'people' ? <PeopleField token={token} q={q} value={v} onChange={nv => set(q.id, nv)} disabled={!!disabled} boxId={id} />
                : <>
                  {q.kind === 'choice' && <div className="mb-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`Quick answers for: ${q.label}`}>{q.choices.map(c => <button key={c} type="button" disabled={disabled} onClick={() => set(q.id, { ...v, text: c })} aria-pressed={v.text === c} className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 text-xs font-semibold ${v.text === c ? 'border-teal bg-teal text-white' : 'border-gray-300 bg-white text-neutral-dark hover:border-teal'}`}>{v.text === c && <Check size={12} aria-hidden="true" />}{c}</button>)}</div>}
                  <input id={id} className={inp} value={v.text} disabled={disabled} onChange={e => set(q.id, { ...v, text: e.target.value })} aria-invalid={bad} aria-describedby={q.hint ? `${id}-hint` : undefined} placeholder={q.kind === 'choice' ? 'Or type your own answer' : undefined} />
                </>}
              {bad && <p role="alert" className="mt-1 text-xs font-medium text-red-700">Please answer this one.</p>}
              {pending.filter(c => c.qid === q.id).map(c => <CheckLine key={c.id} item={c} disabled={disabled} onYes={() => yes(c)} onNo={() => no(c)} />)}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={disabled} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><Send size={14} aria-hidden="true" />Send answers</button>
        {onBack && <button type="button" onClick={onBack} disabled={disabled} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><ArrowLeft size={14} aria-hidden="true" />Go back</button>}
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
