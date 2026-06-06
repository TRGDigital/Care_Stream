'use client'

// Hub Annual Training — staff complete AI-generated, policy-grounded annual
// modules in their first language: read the learning section, then the
// assessment. Passing issues a certificate. Modules stay separate from My Training.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import {
  GraduationCap, CheckCircle2, Circle, Loader2, ChevronLeft, Award, ShieldAlert,
  Clock, AlertTriangle, BookOpen, Printer, RefreshCw,
} from 'lucide-react'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }
const STATE_META: Record<string, { label: string; cls: string }> = {
  todo:        { label: 'To do',       cls: 'bg-gray-100 text-neutral-mid' },
  in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-600' },
  completed:   { label: 'Completed',   cls: 'bg-green-50 text-green-600' },
  due_soon:    { label: 'Renewal due', cls: 'bg-amber-50 text-amber-600' },
  overdue:     { label: 'Overdue',     cls: 'bg-red-50 text-red-600' },
}

function fmt(d?: string | null) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }

export function AnnualTrainingView({ token, onChange }: { token: string; onChange?: () => void }) {
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'take'; id: string; name: string } | { mode: 'cert'; id: string }>({ mode: 'list' })
  if (view.mode === 'take') return <TakeModule token={token} id={view.id} name={view.name} onExit={(toCert) => { onChange?.(); setView(toCert ? { mode: 'cert', id: view.id } : { mode: 'list' }) }} />
  if (view.mode === 'cert') return <CertView token={token} id={view.id} onExit={() => setView({ mode: 'list' })} />
  return <AnnualList token={token} onOpen={(id, name) => setView({ mode: 'take', id, name })} onCert={(id) => setView({ mode: 'cert', id })} />
}

// ─── List ─────────────────────────────────────────────────────────────────────

function AnnualList({ token, onOpen, onCert }: { token: string; onOpen: (id: string, name: string) => void; onCert: (id: string) => void }) {
  const api = createApiClient(token)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.me.annualTraining.list().then(d => setItems(d.items)).catch(() => {}).finally(() => setLoading(false)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex-1 space-y-3 overflow-y-auto p-6">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>

  if (!items.length) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <GraduationCap size={36} className="text-gray-300" />
      <p className="font-medium text-neutral-dark">No annual training assigned</p>
      <p className="text-sm text-neutral-mid">When your manager assigns annual training, it&apos;ll appear here for you to complete.</p>
    </div>
  )

  const todo = items.filter(i => ['todo', 'in_progress', 'overdue', 'due_soon'].includes(i.state) && i.status !== 'complete')
  const renew = items.filter(i => i.status === 'complete' && (i.state === 'overdue' || i.state === 'due_soon'))
  const done = items.filter(i => i.status === 'complete' && i.state === 'completed')

  const Card = (it: any) => {
    const meta = STATE_META[it.state] ?? STATE_META.todo
    const isDone = it.status === 'complete'
    return (
      <div key={it.enrollment_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        {isDone && it.state === 'completed' ? <CheckCircle2 size={18} className="shrink-0 text-green-500" />
          : it.state === 'overdue' ? <AlertTriangle size={18} className="shrink-0 text-red-500" />
          : it.state === 'in_progress' ? <Clock size={18} className="shrink-0 text-amber-500" />
          : <Circle size={18} className="shrink-0 text-gray-300" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-dark">{it.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
            <span className={`rounded-full px-1.5 py-0.5 font-medium ${meta.cls}`}>{meta.label}</span>
            <span>{FREQ_LABEL[it.frequency] ?? it.frequency}</span>
            {it.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">+ practical</span>}
            {isDone && it.expires_at && <span>· renews {fmt(it.expires_at)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isDone && <button onClick={() => onCert(it.enrollment_id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Award size={12} /> Certificate</button>}
          {(!isDone || it.state === 'overdue' || it.state === 'due_soon') && (
            <button onClick={() => onOpen(it.enrollment_id, it.name)} className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90">
              {it.state === 'in_progress' ? 'Continue' : isDone ? 'Renew' : 'Start'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-neutral-dark"><GraduationCap size={20} className="text-teal" /> Annual Training</h2>
        <p className="mb-5 text-sm text-neutral-mid">Training tailored to your home&apos;s policies. Read the lesson, pass the assessment, get your certificate.</p>
        {todo.length > 0 && <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">To complete</p><div className="space-y-2">{todo.map(Card)}</div></div>}
        {renew.length > 0 && <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">Due for renewal</p><div className="space-y-2">{renew.map(Card)}</div></div>}
        {done.length > 0 && <div className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Completed</p><div className="space-y-2">{done.map(Card)}</div></div>}
      </div>
    </div>
  )
}

// ─── Take a module (learn → assess → result) ──────────────────────────────────

function TakeModule({ token, id, name, onExit }: { token: string; id: string; name: string; onExit: (toCert: boolean) => void }) {
  const api = createApiClient(token)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<'learn' | 'assess'>('learn')
  const [sel, setSel] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    api.me.annualTraining.get(id).then(d => {
      setData(d)
      const s: Record<string, number> = {}
      for (const a of (d.answers ?? [])) { const idx = OPTION_LETTERS.indexOf(a.answer_text); if (idx >= 0) s[a.question_id] = idx }
      setSel(s)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(qid: string, oi: number) {
    setSel(prev => ({ ...prev, [qid]: oi }))
    api.training.saveAnswer(id, { question_id: qid, answer_text: OPTION_LETTERS[oi] }).catch(() => {})
  }
  async function submit() {
    if (submitting) return
    setSubmitting(true)
    try { const r = await api.me.annualTraining.submit(id); setResult(r) } catch { /* ignore */ } finally { setSubmitting(false) }
  }

  if (loading || !data) return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}</div>

  const qs: any[] = data.questions ?? []
  const answered = qs.filter(q => sel[q.id] != null).length

  // Result
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto max-w-md text-center">
          {result.passed ? (
            <>
              <Award size={44} className="mx-auto mb-3 text-green-500" />
              <h2 className="text-xl font-bold text-neutral-dark">Passed — {result.score}%</h2>
              <p className="mt-1 text-sm text-neutral-mid">You scored {result.correct}/{result.total}. Your certificate is ready.</p>
              {data.requires_practical && <p className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">Remember: this topic also needs a practical/observed assessment with your manager.</p>}
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => onExit(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90"><Award size={14} /> View certificate</button>
                <button onClick={() => onExit(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Done</button>
              </div>
            </>
          ) : (
            <>
              <RefreshCw size={40} className="mx-auto mb-3 text-amber-500" />
              <h2 className="text-xl font-bold text-neutral-dark">Not passed yet — {result.score}%</h2>
              <p className="mt-1 text-sm text-neutral-mid">You need {result.pass_mark}% ({result.correct}/{result.total} correct). Review the lesson and try the questions again.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => { setResult(null); setPhase('learn') }} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90">Review &amp; retry</button>
                <button onClick={() => onExit(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Later</button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => onExit(false)} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Annual Training</button>
        <h2 className="text-lg font-bold text-neutral-dark">{data.name || name}</h2>

        {data.requires_practical && (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span>This is the <strong>knowledge</strong> part. This topic also needs a practical/observed assessment with your manager.</span>
          </div>
        )}

        {/* Learn */}
        {phase === 'learn' && (
          <div className="mt-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal"><BookOpen size={13} /> Learn</p>
              {data.learning?.summary && <p className="mb-3 text-sm text-neutral-dark">{data.learning.summary}</p>}
              {Array.isArray(data.learning?.key_points) && data.learning.key_points.length > 0 && (
                <ul className="space-y-1.5">
                  {data.learning.key_points.map((p: string, i: number) => <li key={i} className="flex gap-2 text-sm text-neutral-dark"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />{p}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => setPhase('assess')} className="mt-4 w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90">Start assessment ({qs.length} questions)</button>
          </div>
        )}

        {/* Assess */}
        {phase === 'assess' && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-neutral-mid">
              <button onClick={() => setPhase('learn')} className="hover:text-teal">← Back to the lesson</button>
              <span>{answered}/{qs.length} answered · pass mark {data.pass_mark}%</span>
            </div>
            <div className="space-y-3">
              {qs.map((q, qi) => (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-neutral-dark">{qi + 1}. {q.text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt: string, oi: number) => (
                      <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${sel[q.id] === oi ? 'border-teal bg-teal-light/30 text-neutral-dark' : 'border-gray-200 text-neutral-dark hover:border-teal/50'}`}>
                        <input type="radio" name={`q-${q.id}`} checked={sel[q.id] === oi} onChange={() => pick(q.id, oi)} className="accent-teal" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submit} disabled={answered < qs.length || submitting} className="mt-4 w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
              {submitting ? 'Marking…' : answered < qs.length ? `Answer all ${qs.length} to submit` : 'Submit assessment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Certificate ──────────────────────────────────────────────────────────────

function CertView({ token, id, onExit }: { token: string; id: string; onExit: () => void }) {
  const api = createApiClient(token)
  const [c, setC] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.me.annualTraining.certificate(id).then(setC).catch(() => {}).finally(() => setLoading(false)) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function print() { document.body.classList.add('printing-cert'); window.print(); setTimeout(() => document.body.classList.remove('printing-cert'), 600) }

  if (loading) return <div className="flex-1 p-6"><div className="h-64 animate-pulse rounded-xl bg-gray-100" /></div>
  if (!c) return <div className="flex-1 p-6"><button onClick={onExit} className="text-sm text-teal">← Back</button><p className="mt-4 text-sm text-neutral-mid">Certificate not available.</p></div>

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button onClick={onExit} className="inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Annual Training</button>
          <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-dark hover:border-teal/40 hover:text-teal"><Printer size={14} /> Print / save PDF</button>
        </div>

        <div className="cert-sheet rounded-xl border-2 border-teal/30 bg-white p-8 text-center shadow-card">
          <div className="mb-4 flex items-center justify-center gap-3">
            {c.logo_url ? <img src={c.logo_url} alt="" className="h-12 w-auto object-contain" /> : null}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">Certificate of Completion</p>
          <p className="mt-1 text-xs text-neutral-mid">Knowledge Assessment</p>
          <p className="mt-6 text-sm text-neutral-mid">This certifies that</p>
          <p className="mt-1 text-2xl font-bold text-neutral-dark">{c.staff_name}</p>
          <p className="mt-4 text-sm text-neutral-mid">has completed the annual training module</p>
          <p className="mt-1 text-lg font-semibold text-neutral-dark">{c.module_name}</p>
          <p className="mt-1 text-sm text-neutral-mid">for {c.org_name}</p>

          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3 text-xs">
            <div><p className="font-semibold text-neutral-dark">{c.score}%</p><p className="text-neutral-mid">Score</p></div>
            <div><p className="font-semibold text-neutral-dark">{fmt(c.completed_at)}</p><p className="text-neutral-mid">Completed</p></div>
            <div><p className="font-semibold text-neutral-dark">{c.expires_at ? fmt(c.expires_at) : '—'}</p><p className="text-neutral-mid">Renews</p></div>
          </div>

          {c.requires_practical && <p className="mx-auto mt-5 max-w-md rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">This is the knowledge component. A practical/observed competency assessment is also required for this topic.</p>}

          <p className="mt-6 text-[10px] leading-relaxed text-neutral-mid">Tailored to {c.org_name}&apos;s own policies and assessed by CareStream. This records completion of a knowledge assessment and is not an accredited qualification; the provider remains responsible for ensuring training meets regulatory requirements.</p>
          <p className="mt-2 text-[10px] font-medium text-teal">CareStream</p>
        </div>
      </div>
    </div>
  )
}
