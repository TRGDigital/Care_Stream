'use client'

// Staff hub — "My Diplomas": the programme container over the learner's ordinary
// annual-training records. Units open in the SAME player as any other module
// (TakeModule), so nothing about the learning experience is duplicated here. This
// view only adds what is genuinely programme-level: the unit map, the cross-unit
// final assessment, the reflective account and the diploma certificate.

import { useEffect, useRef, useState } from 'react'
import { Award, GraduationCap, Lock, CheckCircle2, Clock, AlertCircle, ArrowLeft, Printer, TrendingUp, Download, Loader2 } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { TakeModule } from '@/components/hub/annual-training-view'
import { ProgrammeCertificate } from '@/components/programme-certificate'
import { downloadElementAsPdf, safeFileName } from '@/lib/download-pdf'

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

const KIND_LABEL: Record<string, string> = { diploma: 'Diploma', pathway: 'Pathway', award: 'Award' }

export function ProgrammesView({
  token, onChange, onTalkToPolicy, secondLang = null,
}: {
  token: string
  onChange?: () => void
  onTalkToPolicy?: (policyId: string, title: string) => void
  secondLang?: { name: string } | null
}) {
  const [view, setView] = useState<
    | { mode: 'list' }
    | { mode: 'detail'; id: string }
    | { mode: 'take'; id: string; name: string; back: string }
    | { mode: 'cert'; id: string }
  >({ mode: 'list' })

  if (view.mode === 'take') {
    return (
      <TakeModule
        token={token} id={view.id} name={view.name} secondLang={secondLang} onTalkToPolicy={onTalkToPolicy}
        backLabel="Diploma"
        onExit={() => { onChange?.(); setView({ mode: 'detail', id: view.back }) }}
      />
    )
  }
  if (view.mode === 'cert') return <ProgrammeCertView token={token} id={view.id} onExit={() => setView({ mode: 'detail', id: view.id })} />
  if (view.mode === 'detail') {
    return (
      <ProgrammeDetail
        token={token} id={view.id} secondLang={secondLang}
        onBack={() => setView({ mode: 'list' })}
        onOpenUnit={(unitEnrolmentId, name) => setView({ mode: 'take', id: unitEnrolmentId, name, back: view.id })}
        onCert={() => setView({ mode: 'cert', id: view.id })}
        onChange={onChange}
      />
    )
  }
  return <ProgrammeList token={token} onOpen={(id) => setView({ mode: 'detail', id })} />
}

// ─── List ─────────────────────────────────────────────────────────────────────

function ProgressBar({ percent, complete }: { percent: number; complete: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all ${complete ? 'bg-green-500' : 'bg-teal'}`}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  )
}

function ProgrammeList({ token, onOpen }: { token: string; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    createApiClient(token).me.programmes.list()
      .then(d => setItems(d.items))
      .catch(e => setError(e?.message ?? 'Could not load your diplomas.'))
  }, [token])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Could not load your diplomas.</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }
  if (!items) return <div className="p-6 text-sm text-neutral-mid">Loading…</div>

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-light/40">
          <GraduationCap size={26} className="text-teal" />
        </div>
        <h2 className="text-lg font-bold text-neutral-dark">No diplomas yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">
          A diploma groups several training courses together, with a final assessment across all of them.
          Your manager can put you on one.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-bold text-neutral-dark">My Diplomas</h1>
      <p className="mt-1 text-sm text-neutral-mid">
        Several courses studied together, then one final assessment across all of them.
      </p>

      <div className="mt-5 space-y-3">
        {items.map(it => (
          <button
            key={it.enrollment_id}
            onClick={() => onOpen(it.enrollment_id)}
            className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-teal/40 hover:shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-dark">
                    {KIND_LABEL[it.kind] ?? 'Programme'}
                  </span>
                  {it.complete && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <CheckCircle2 size={11} /> Complete
                    </span>
                  )}
                  {it.due_date && !it.complete && (
                    <span className="text-[11px] text-neutral-mid">Due {fmt(it.due_date)}</span>
                  )}
                </div>
                <h2 className="mt-1.5 truncate font-semibold text-neutral-dark">{it.name}</h2>
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-mid">{it.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-teal">{it.percent}%</p>
                <p className="text-[10px] uppercase tracking-wide text-neutral-mid">
                  {it.units_complete}/{it.units_total} units
                </p>
              </div>
            </div>

            <div className="mt-3"><ProgressBar percent={it.percent} complete={it.complete} /></div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-mid">
              {it.cpd_minutes_done > 0 && <span><strong className="text-neutral-dark">{Math.round((it.cpd_minutes_done / 60) * 10) / 10} h</strong> of CPD so far</span>}
              {it.can_take_synoptic && <span className="font-semibold text-teal">Final assessment ready</span>}
              {!it.complete && it.blocking?.length > 0 && <span>{it.blocking[0]}</span>}
              {it.complete && it.completed_at && <span>Earned {fmt(it.completed_at)}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function ProgrammeDetail({
  token, id, secondLang, onBack, onOpenUnit, onCert, onChange,
}: {
  token: string
  id: string
  secondLang?: { name: string } | null
  onBack: () => void
  onOpenUnit: (unitEnrolmentId: string, name: string) => void
  onCert: () => void
  onChange?: () => void
}) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<'overview' | 'synoptic'>('overview')

  const api = createApiClient(token)
  const load = () => api.me.programmes.get(id).then(setData).catch(e => setError(e?.message ?? 'Could not load this diploma.'))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, id])

  if (error) return <div className="mx-auto max-w-2xl p-6 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-6 text-sm text-neutral-mid">Loading…</div>

  const p = data.progress

  if (stage === 'synoptic') {
    return (
      <SynopticAssessment
        token={token} enrollmentId={id} name={data.name}
        questions={data.synoptic} passMark={data.synoptic_pass_mark}
        onExit={(passed) => { setStage('overview'); load().then(() => { if (passed) onChange?.() }) }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-neutral-dark">
        <ArrowLeft size={14} /> My Diplomas
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <span className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-dark">
          {KIND_LABEL[data.kind] ?? 'Programme'}
        </span>
        <h1 className="mt-2 text-xl font-bold text-neutral-dark">{data.name}</h1>
        <p className="mt-1 text-sm text-neutral-mid">{data.description}</p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex-1">
            <ProgressBar percent={p.percent} complete={p.complete} />
            <p className="mt-1.5 text-xs text-neutral-mid">
              {p.units_complete} of {p.units_total} units complete
              {p.cpd_minutes_done > 0 && <> · {Math.round((p.cpd_minutes_done / 60) * 10) / 10} CPD hours earned</>}
            </p>
          </div>
          <p className="text-3xl font-bold text-teal">{p.percent}%</p>
        </div>

        {p.complete ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle2 size={16} className="text-green-600" />
            <p className="flex-1 text-sm text-green-800">
              Diploma earned{data.completed_at ? ` on ${fmt(data.completed_at)}` : ''}.
            </p>
            <button onClick={onCert} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark">
              <Award size={14} /> View certificate
            </button>
          </div>
        ) : p.blocking?.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">Still to do</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-700">
              {p.blocking.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Outcomes */}
      {data.outcomes?.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-teal-dark">What you will be able to do</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-dark">
            {data.outcomes.map((o: string, i: number) => <li key={i}>{o}</li>)}
          </ol>
        </div>
      )}

      {/* Units */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-teal-dark">
          Units {data.sequential && <span className="font-normal text-neutral-mid">· take these in order</span>}
        </h2>
        <div className="mt-3 space-y-2">
          {data.units.map((u: any, i: number) => {
            const done    = u.status === 'complete'
            const expired = u.status === 'expired'
            const locked  = u.locked
            const openable = !locked && !!u.enrollment_id
            return (
              <div
                key={u.module_id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${done ? 'border-green-200 bg-green-50/40' : locked ? 'border-gray-100 bg-neutral-light/30' : 'border-gray-200 bg-white'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-500 text-white' : locked ? 'bg-gray-200 text-neutral-mid' : 'bg-teal-light/50 text-teal-dark'}`}>
                  {done ? <CheckCircle2 size={15} /> : locked ? <Lock size={13} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${locked ? 'text-neutral-mid' : 'text-neutral-dark'}`}>
                    {u.name}
                    {u.is_optional && <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-mid">optional</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-mid">
                    {u.duration_minutes && <span className="inline-flex items-center gap-1"><Clock size={10} /> {u.duration_minutes} min</span>}
                    {done && u.score != null && <span className="font-medium text-green-700">Passed {u.score}%</span>}
                    {done && u.completed_at && <span>{fmt(u.completed_at)}</span>}
                    {expired && <span className="font-medium text-amber-600">Needs renewing</span>}
                    {u.requires_practical && (
                      <span className={u.practical_signed ? 'text-teal' : 'text-amber-600'}>
                        {u.practical_signed ? 'Observed ✓' : '+ practical sign-off needed'}
                      </span>
                    )}
                    {locked && <span>Finish the earlier units first</span>}
                  </p>
                </div>
                {openable && (
                  <button
                    onClick={() => onOpenUnit(u.enrollment_id, u.name)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${done ? 'border border-gray-200 bg-white text-neutral-dark hover:bg-neutral-light' : 'bg-teal text-white hover:bg-teal-dark'}`}
                  >
                    {done ? 'Review' : expired ? 'Renew' : u.status === 'in_progress' ? 'Continue' : 'Start'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Final assessment */}
      {data.synoptic_count > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-teal-dark">Final assessment</h2>
          <p className="mt-1 text-sm text-neutral-mid">
            {data.synoptic_count} questions drawing on more than one unit at a time. You need {data.synoptic_pass_mark}% to pass.
          </p>
          {data.synoptic_score != null && (
            <p className={`mt-2 text-sm font-semibold ${data.synoptic_score >= data.synoptic_pass_mark ? 'text-green-700' : 'text-amber-700'}`}>
              {data.synoptic_score >= data.synoptic_pass_mark ? 'Passed' : 'Last attempt'} — {data.synoptic_score}%
              {data.synoptic_at && <span className="ml-1 font-normal text-neutral-mid">({fmt(data.synoptic_at)})</span>}
            </p>
          )}
          {p.can_take_synoptic ? (
            <button
              onClick={() => setStage('synoptic')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
            >
              <GraduationCap size={15} /> {data.synoptic_score != null ? 'Try again' : 'Start the final assessment'}
            </button>
          ) : !p.units_ready ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-light/60 px-3 py-2 text-xs text-neutral-mid">
              <Lock size={13} /> Unlocks when every unit is complete
            </p>
          ) : null}
        </div>
      )}

      {/* Reflective account */}
      {data.require_reflection && (
        <ReflectionPanel
          token={token} enrollmentId={id} initial={data.reflection}
          unlocked={p.units_ready}
          onSaved={() => { load(); onChange?.() }}
        />
      )}
    </div>
  )
}

// ─── Reflective account ───────────────────────────────────────────────────────

function ReflectionPanel({
  token, enrollmentId, initial, unlocked, onSaved,
}: {
  token: string
  enrollmentId: string
  initial: string | null
  unlocked: boolean
  onSaved: () => void
}) {
  const [text, setText] = useState(initial ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const t = text.trim()
    if (!t || saving) return
    setSaving(true); setError('')
    try {
      await createApiClient(token).me.programmes.saveReflection(enrollmentId, t)
      setSaved(true)
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-teal-dark">Reflective account</h2>
      <p className="mt-1 text-sm text-neutral-mid">
        In your own words: what will you do differently at work because of this diploma? Give a real example.
      </p>
      {!unlocked && !initial ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-light/60 px-3 py-2 text-xs text-neutral-mid">
          <Lock size={13} /> You can write this once your units are done
        </p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setSaved(false) }}
            rows={5}
            maxLength={5000}
            placeholder="For example: I now check a resident's care plan for their communication needs before I start personal care, because…"
            className="mt-3 w-full rounded-lg border border-gray-200 p-3 text-sm text-neutral-dark focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/30"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !text.trim()}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Update reflection' : 'Save reflection'}
            </button>
            {saved && <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Saved</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Synoptic assessment ──────────────────────────────────────────────────────

function SynopticAssessment({
  token, enrollmentId, name, questions, passMark, onExit,
}: {
  token: string
  enrollmentId: string
  name: string
  questions: Array<{ id: string; text: string; options: string[] }>
  passMark: number
  onExit: (passed: boolean) => void
}) {
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; score: number; correct: number; total: number; programme_complete: boolean; blocking: string[] } | null>(null)
  const [error, setError] = useState('')

  const answeredAll = questions.length > 0 && questions.every(q => picked[q.id] != null)

  async function submit() {
    if (!answeredAll || submitting) return
    setSubmitting(true); setError('')
    try {
      const r = await createApiClient(token).me.programmes.submitSynoptic(enrollmentId, picked)
      setResult(r)
    } catch (e: any) {
      setError(e?.message ?? 'Could not submit. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${result.passed ? 'bg-green-100' : 'bg-amber-100'}`}>
          {result.passed ? <Award size={30} className="text-green-600" /> : <TrendingUp size={30} className="text-amber-600" />}
        </div>
        <h2 className="text-xl font-bold text-neutral-dark">
          {result.passed ? 'Passed' : 'Not passed yet'} — {result.score}%
        </h2>
        <p className="mt-1 text-sm text-neutral-mid">
          You scored {result.correct}/{result.total}. {result.passed ? '' : `You need ${passMark}% to pass — review the units and try again.`}
        </p>
        {result.passed && result.programme_complete && (
          <p className="mx-auto mt-3 max-w-sm rounded-lg bg-green-50 p-3 text-sm text-green-800">
            That completes your diploma. Your certificate is ready.
          </p>
        )}
        {result.passed && !result.programme_complete && result.blocking?.length > 0 && (
          <div className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-700">
            <p className="font-semibold">Nearly there — still to do:</p>
            <ul className="mt-1 list-disc pl-4">
              {result.blocking.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}
        <button
          onClick={() => onExit(result.passed)}
          className="mt-5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
        >
          Back to the diploma
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <button onClick={() => onExit(false)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-neutral-dark">
        <ArrowLeft size={14} /> {name}
      </button>

      <div className="rounded-xl border border-teal/30 bg-teal-light/20 p-4">
        <h1 className="text-lg font-bold text-neutral-dark">Final assessment</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          These questions bring together more than one of your units. Answer all {questions.length} —
          you need {passMark}% to pass. You can retake it if you do not pass.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-neutral-dark">
              <span className="mr-1.5 text-neutral-mid">{qi + 1}.</span>{q.text}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((o, oi) => {
                const on = picked[q.id] === oi
                return (
                  <button
                    key={oi}
                    onClick={() => setPicked(prev => ({ ...prev, [q.id]: oi }))}
                    className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left text-sm transition ${on ? 'border-teal bg-teal-light/30 text-neutral-dark' : 'border-gray-200 bg-white text-neutral-dark hover:border-teal/40'}`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${on ? 'border-teal bg-teal text-white' : 'border-gray-300 text-neutral-mid'}`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{o}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-gray-100 bg-white/95 py-3 backdrop-blur">
        <p className="text-xs text-neutral-mid">
          {Object.keys(picked).length}/{questions.length} answered
        </p>
        <button
          onClick={submit}
          disabled={!answeredAll || submitting}
          className="rounded-lg bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit final assessment'}
        </button>
      </div>
    </div>
  )
}

// ─── Certificate ──────────────────────────────────────────────────────────────

function ProgrammeCertView({ token, id, onExit }: { token: string; id: string; onExit: () => void }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    createApiClient(token).me.programmes.certificate(id)
      .then(setData)
      .catch(e => setError(e?.message ?? 'No certificate yet.'))
  }, [token, id])

  const certRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  function print() {
    document.body.classList.add('printing-cert')
    window.print()
    setTimeout(() => document.body.classList.remove('printing-cert'), 600)
  }

  async function download() {
    if (!certRef.current || saving) return
    setSaving(true)
    try { await downloadElementAsPdf(certRef.current, safeFileName(`${data?.programme_name ?? 'Certificate'} - ${data?.staff_name ?? ''}`)) }
    catch { print() }
    finally { setSaving(false) }
  }

  if (error) return <div className="mx-auto max-w-2xl p-6 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-6 text-sm text-neutral-mid">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-neutral-dark">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light">
            <Printer size={14} /> Print
          </button>
          <button onClick={download} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Preparing…</> : <><Download size={14} /> Download PDF</>}
          </button>
        </div>
      </div>

      <div ref={certRef}>
      <ProgrammeCertificate
        staffName={data.staff_name}
        staffRole={data.staff_role}
        programmeName={data.programme_name}
        kind={data.kind}
        orgName={data.org_name}
        orgLogoUrl={data.logo_url}
        completedAt={data.completed_at}
        expiresAt={data.expires_at}
        cpd={data.cpd}
        independentlyReviewed={data.independently_reviewed}
        attestedByName={data.attested_by_name}
        attestedByRole={data.attested_by_role}
        synoptic={data.synoptic}
        averageUnitScore={data.average_unit_score}
        learningGain={data.learning_gain}
        practicalSignedCount={data.practical_signed_count}
        outcomes={data.outcomes}
        standards={data.standards}
        units={data.units}
        reflection={data.reflection}
      />
      </div>
    </div>
  )
}
