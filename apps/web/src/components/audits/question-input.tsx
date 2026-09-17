'use client'

// The answer control for one audit question, for every question type. Shared by the admin audit
// page and the hub so both ask questions the same way. Notes and actions fields stay with the page.

import { clsx } from 'clsx'
import { isYesNo, parseMulti, outcomeFor, type QuestionSettings } from '@/lib/audit-questions'

export type AuditAnswer = {
  answer_yn: boolean | null
  answer_na: boolean
  no_compliant: boolean | null
  answer_value: string | null
  outcome_text: string
  actions_text: string
}

export const EMPTY_ANSWER: AuditAnswer = { answer_yn: null, answer_na: false, no_compliant: null, answer_value: null, outcome_text: '', actions_text: '' }

export function answerFromRow(a: any): AuditAnswer {
  return {
    answer_yn: a?.answer_yn ?? null, answer_na: a?.answer_na ?? false, no_compliant: a?.no_compliant ?? null,
    answer_value: a?.answer_value ?? null, outcome_text: a?.outcome_text ?? '', actions_text: a?.actions_text ?? '',
  }
}

const pill = (active: boolean, tone: 'green' | 'red' | 'grey' | 'teal') => clsx(
  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
  active
    ? { green: 'bg-green-500 text-white', red: 'bg-red-500 text-white', grey: 'bg-gray-400 text-white', teal: 'bg-teal text-white' }[tone]
    : 'border border-gray-200 text-neutral-mid hover:border-teal/50 hover:text-neutral-dark',
)

export function QuestionInput({ q, a, onChange, disabled }: {
  q: any
  a: AuditAnswer
  onChange: (patch: Partial<AuditAnswer>) => void
  disabled?: boolean
}) {
  const t: string = q.question_type
  const s: QuestionSettings = q.settings ?? {}
  const setValue = (v: string | null) => onChange({ answer_value: v, answer_na: false, answer_yn: null, no_compliant: null })
  const naButton = s.allow_na && !isYesNo(t) && (
    <button type="button" disabled={disabled} onClick={() => onChange({ answer_na: !a.answer_na, answer_value: null })} className={pill(a.answer_na, 'grey')}>N/A</button>
  )
  const out = outcomeFor(q, a)
  const verdict = out === 'fail'
    ? <span className="text-xs font-medium text-red-600">Outside the expected answer</span>
    : out === 'pass' ? <span className="text-xs font-medium text-green-600">Within the expected answer</span> : null

  if (isYesNo(t)) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => onChange({ answer_yn: true, answer_na: false, no_compliant: null })} className={pill(a.answer_yn === true && !a.answer_na, 'green')}>Yes</button>
          <button type="button" disabled={disabled} onClick={() => onChange({ answer_yn: false, answer_na: false })} className={pill(a.answer_yn === false && !a.answer_na, 'red')}>No</button>
          {t === 'yes_no_na' && (
            <button type="button" disabled={disabled} onClick={() => onChange({ answer_na: !a.answer_na, answer_yn: null, no_compliant: null })} className={pill(a.answer_na, 'grey')}>N/A</button>
          )}
        </div>
        {/* A No must be classified: the correct answer (a pass) or a genuine gap (a fail). */}
        {a.answer_yn === false && !a.answer_na && (
          <div className={clsx('rounded-lg border p-3', a.no_compliant === null ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50')}>
            <p className="mb-2 text-xs font-medium text-neutral-dark">
              Is &ldquo;No&rdquo; the correct answer, or a gap?
              {a.no_compliant === null && <span className="ml-1 font-semibold text-amber-700">Please choose one to continue.</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={disabled} onClick={() => onChange({ no_compliant: true })}
                className={clsx('rounded-btn border px-3 py-1.5 text-xs font-medium disabled:opacity-50', a.no_compliant === true ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 text-neutral-mid hover:border-green-500 hover:text-green-700')}>
                No is the correct answer
              </button>
              <button type="button" disabled={disabled} onClick={() => onChange({ no_compliant: false })}
                className={clsx('rounded-btn border px-3 py-1.5 text-xs font-medium disabled:opacity-50', a.no_compliant === false ? 'border-rose-600 bg-rose-600 text-white' : 'border-gray-300 text-neutral-mid hover:border-rose-500 hover:text-rose-700')}>
                It&rsquo;s a gap: we don&rsquo;t have this or haven&rsquo;t done it
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (t === 'number') {
    const range = [s.min != null ? `min ${s.min}` : '', s.max != null ? `max ${s.max}` : ''].filter(Boolean).join(', ')
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" inputMode="decimal" step="any" disabled={disabled || a.answer_na} value={a.answer_value ?? ''}
          onChange={e => setValue(e.target.value === '' ? null : e.target.value)}
          className="w-32 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none disabled:bg-gray-50" />
        {s.unit && <span className="text-sm text-neutral-mid">{s.unit}</span>}
        {range && <span className="text-xs text-neutral-mid">Expected: {range}</span>}
        {naButton}
        {verdict}
      </div>
    )
  }

  if (t === 'date') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" disabled={disabled || a.answer_na} value={a.answer_value ?? ''}
          onChange={e => setValue(e.target.value || null)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none disabled:bg-gray-50" />
        {naButton}
      </div>
    )
  }

  if (t === 'choice') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {(s.options ?? []).map(o => (
          <button key={o.label} type="button" disabled={disabled} onClick={() => setValue(a.answer_value === o.label ? null : o.label)}
            className={pill(a.answer_value === o.label && !a.answer_na, o.fail ? 'red' : 'teal')}>{o.label}</button>
        ))}
        {naButton}
      </div>
    )
  }

  if (t === 'multi_choice') {
    const picked = parseMulti(a.answer_value)
    const toggle = (label: string) => {
      const next = picked.includes(label) ? picked.filter(x => x !== label) : [...picked, label]
      onChange({ answer_value: next.length ? JSON.stringify(next) : null, answer_na: false })
    }
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(s.options ?? []).map(o => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-dark">
              <input type="checkbox" disabled={disabled || a.answer_na} checked={picked.includes(o.label)} onChange={() => toggle(o.label)} className="accent-teal" />
              {o.label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">{naButton}{verdict}</div>
      </div>
    )
  }

  if (t === 'rating') {
    const max = s.max_rating ?? 5
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: max }, (_, i) => String(i + 1)).map(v => (
          <button key={v} type="button" disabled={disabled} onClick={() => setValue(a.answer_value === v ? null : v)}
            className={clsx('h-9 w-9 rounded-md text-sm font-semibold', a.answer_value === v && !a.answer_na ? 'bg-teal text-white' : 'border border-gray-200 text-neutral-mid hover:border-teal/50')}>{v}</button>
        ))}
        {s.pass_min != null && <span className="ml-1 text-xs text-neutral-mid">{s.pass_min} or above expected</span>}
        {naButton}
        {verdict}
      </div>
    )
  }

  return null
}
