'use client'

// Hub Annual Training — staff complete AI-generated, policy-grounded annual
// modules in their first language: read the learning section, then the
// assessment. Passing issues a certificate. Modules stay separate from My Training.

import { useEffect, useRef, useState } from 'react'
import { createApiClient, apiAssetUrl } from '@/lib/api-client'
import { TrainingRatingCard } from '@/components/hub/training-rating-card'
import { SuggestTranslation, InlineEditableText } from '@/components/hub/suggest-translation'
import { ListenButton } from '@/components/hub/listen-button'
import { ActivityStep, type Activity as HubActivity } from '@/components/hub/activity-step'
import { joinSpoken, speakOverview, speakQuestion } from '@/lib/speech'
import { persistentCache, hubKey } from '@/lib/page-cache'
import { TrainingCertificate } from '@/components/training-certificate'
import {
  GraduationCap, CheckCircle2, Circle, Loader2, ChevronLeft, ChevronDown, ChevronUp, Award, ShieldAlert,
  Clock, AlertTriangle, BookOpen, Printer, RefreshCw, MessageSquare, FileText, Lightbulb, Globe, Languages,
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

export function AnnualTrainingView({ token, userId, onChange, onTalkToPolicy, secondLang = null, reviewer = false }: { token: string; userId: string; onChange?: () => void; onTalkToPolicy?: (policyId: string, title: string) => void; secondLang?: { name: string } | null; reviewer?: boolean }) {
  // If the admin enabled second-language switching, secondLang is the name of their
  // second language; inside a module they can flip the CURRENT overview/section into
  // it (a per-step aid), reverting to the first language on the next step.
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'take'; id: string; name: string } | { mode: 'cert'; id: string }>({ mode: 'list' })
  if (view.mode === 'take') return <TakeModule token={token} id={view.id} name={view.name} secondLang={secondLang} onTalkToPolicy={onTalkToPolicy} onExit={(toCert) => { onChange?.(); setView(toCert ? { mode: 'cert', id: view.id } : { mode: 'list' }) }} />
  if (view.mode === 'cert') return <CertView token={token} id={view.id} onExit={() => setView({ mode: 'list' })} />
  return <AnnualList token={token} userId={userId} secondLang={secondLang} reviewer={reviewer} onOpen={(id, name) => setView({ mode: 'take', id, name })} onCert={(id) => setView({ mode: 'cert', id })} />
}

// CPD assessor notes + status panel shown under each module in reviewer mode.
function ReviewerNotes({ token, moduleId, initial }: { token: string; moduleId: string; initial?: { notes: string; status: string } }) {
  const [notes, setNotes]   = useState(initial?.notes ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'not_reviewed')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  async function save(nextStatus?: string) {
    setSaving(true); setSaved(false)
    try { await createApiClient(token).me.saveModuleReview(moduleId, { notes, status: nextStatus ?? status }); setSaved(true); setTimeout(() => setSaved(false), 1500) }
    finally { setSaving(false) }
  }
  const STATUS_LABEL: Record<string, string> = { not_reviewed: 'Not reviewed', reviewed: 'Reviewed', needs_discussion: 'Needs discussion' }
  return (
    <div className="border-t border-gray-100 bg-neutral-light/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-teal">Assessor review</span>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); save(e.target.value) }}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-neutral-dark focus:border-teal focus:outline-none"
        >
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Notes and feedback on this module…"
        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => save()} disabled={saving} className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
      </div>
    </div>
  )
}

// ─── List ─────────────────────────────────────────────────────────────────────

function AnnualList({ token, userId, onOpen, onCert, secondLang = null, reviewer = false }: { token: string; userId: string; onOpen: (id: string, name: string) => void; onCert: (id: string) => void; secondLang?: { name: string } | null; reviewer?: boolean }) {
  const api = createApiClient(token)
  const ck = hubKey('annual', userId)
  const cached = persistentCache.get<any[]>(ck)
  const [items, setItems] = useState<any[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)   // instant from cache, revalidate in background
  const [error, setError] = useState(false)
  const [reviews, setReviews] = useState<Record<string, { notes: string; status: string }>>({})

  useEffect(() => {
    api.me.annualTraining.list()
      .then(d => { setItems(d.items); persistentCache.set(ck, d.items); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!reviewer) return
    api.me.moduleReviews().then(d => {
      const m: Record<string, { notes: string; status: string }> = {}
      d.reviews.forEach(r => { m[r.module_id] = { notes: r.notes ?? '', status: r.status } })
      setReviews(m)
    }).catch(() => {})
  }, [reviewer]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex-1 space-y-3 overflow-y-auto p-6">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>

  if (error && !items.length) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <AlertTriangle size={32} className="text-amber-400" />
      <p className="font-medium text-neutral-dark">Couldn&apos;t load your annual training</p>
      <p className="text-sm text-neutral-mid">Please check your connection and try again.</p>
      <button onClick={() => { setLoading(true); setError(false); api.me.annualTraining.list().then(d => { setItems(d.items); persistentCache.set(ck, d.items) }).catch(() => setError(true)).finally(() => setLoading(false)) }} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90">Retry</button>
    </div>
  )

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
      <div key={it.enrollment_id} className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 p-4">
        {it.illustration_url && <img src={apiAssetUrl(it.illustration_url) ?? ''} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
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
          {(reviewer || !isDone || it.state === 'overdue' || it.state === 'due_soon') && (
            <button onClick={() => onOpen(it.enrollment_id, it.name)} className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90">
              {reviewer ? 'Open module' : it.state === 'in_progress' ? 'Continue' : isDone ? 'Renew' : 'Start'}
            </button>
          )}
        </div>
      </div>
      {reviewer
        ? <ReviewerNotes key={reviews[it.module_id] ? 'loaded' : 'empty'} token={token} moduleId={it.module_id} initial={reviews[it.module_id]} />
        : (isDone && !it.rated && (
            <div className="border-t border-gray-100 p-4">
              <TrainingRatingCard token={token} area="annual" refId={it.enrollment_id} />
            </div>
          ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-neutral-dark"><GraduationCap size={20} className="text-teal" /> {reviewer ? 'Annual Training — CPD Review' : 'Annual Training'}</h2>
        <p className="mb-5 text-sm text-neutral-mid">{reviewer
          ? 'Open each module to go through it as a learner (lesson, scenarios, assessment and live follow-ups), then add your notes and status below it.'
          : 'Training tailored to your home’s policies. Read the lesson, pass the assessment, get your certificate.'}</p>
        {todo.length > 0 && <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">To complete</p><div className="space-y-2">{todo.map(Card)}</div></div>}
        {renew.length > 0 && <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">Due for renewal</p><div className="space-y-2">{renew.map(Card)}</div></div>}
        {done.length > 0 && <div className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Completed</p><div className="space-y-2">{done.map(Card)}</div></div>}
      </div>
    </div>
  )
}

// 1–5 rating scale used by the post-completion evaluation.
function Scale({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium text-neutral-dark">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition-colors ${value === n ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-mid hover:border-teal/50'}`}>{n}</button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-mid"><span>{low}</span><span>{high}</span></div>
    </div>
  )
}

// ─── Take a module (learn → assess → result) ──────────────────────────────────

export function TakeModule({ token, id, name, onExit, onTalkToPolicy, backLabel = 'Annual Training', secondLang = null, switchArea = 'annual' }: { token: string; id: string; name: string; onExit: (toCert: boolean) => void; onTalkToPolicy?: (policyId: string, title: string) => void; backLabel?: string; secondLang?: { name: string } | null; switchArea?: 'annual' | 'training' }) {
  const api = createApiClient(token)
  const [data, setData] = useState<any>(null)            // first-language module (the default)
  const [data2, setData2] = useState<any>(null)          // second-language version, fetched lazily + cached
  const [loadingSecond, setLoadingSecond] = useState(false)
  const [showSecond, setShowSecond] = useState(false)    // show the CURRENT learn step in the 2nd language
  const [qLang, setQLang] = useState<Record<string, boolean>>({})  // per-question 2nd language in the assessment
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<'learn' | 'assess'>('learn')
  const [policiesOpen, setPoliciesOpen] = useState(false)
  const [step, setStep] = useState(0)  // 0 = overview, 1..N = sections (paginated lesson)
  const [sel, setSel] = useState<Record<string, number>>({})
  const [checkSel, setCheckSel] = useState<Record<string, number>>({})  // in-lesson knowledge checks
  const [actDone, setActDone] = useState<Record<string, boolean>>({})   // interactive activities attempted
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})  // scenario answers revealed
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [evalConfidence, setEvalConfidence] = useState<number | null>(null)
  const [evalUsefulness, setEvalUsefulness] = useState<number | null>(null)
  const [evalComment, setEvalComment] = useState('')
  const [evalDone, setEvalDone] = useState(false)
  const [baselineSel, setBaselineSel] = useState<Record<string, number>>({})  // pre-lesson knowledge check
  const [baselineResult, setBaselineResult] = useState<{ score: number; total: number } | null>(null)
  const baselineSubmittedRef = useRef(false)
  const [termsOpen, setTermsOpen] = useState(false)      // "Key terms" accordion on the overview
  const [refsOpen, setRefsOpen] = useState(false)        // "References" accordion on the overview
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const learnSecondsRef = useRef(0)
  const phaseRef = useRef<'learn' | 'assess'>('learn')

  // Jump back to the top whenever the phase, step or result changes, so each
  // lesson step / the assessment opens at the top rather than keeping the scroll.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [phase, step, result])

  // Accumulate active time on the LESSON (paused when the tab is hidden) to
  // substantiate the module's claimed CPD duration. Flushed on leaving the lesson.
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => {
    const iv = setInterval(() => {
      if (phaseRef.current === 'learn' && (typeof document === 'undefined' || document.visibilityState === 'visible')) learnSecondsRef.current += 1
    }, 1000)
    return () => { clearInterval(iv); flushLearnTime() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function flushLearnTime() {
    const secs = learnSecondsRef.current
    if (secs > 0) { learnSecondsRef.current = 0; api.me.annualTraining.recordLearnTime(id, secs).catch(() => {}) }
  }
  function submitEval() {
    setEvalDone(true)
    api.me.annualTraining.evaluate(id, { confidence: evalConfidence, usefulness: evalUsefulness, comment: evalComment.trim() || undefined }).catch(() => {})
  }
  // Fire-and-forget: the learner always moves on to the lesson, even if the
  // baseline submission fails. The returned score powers the learning-gain line.
  function submitBaselineAnswers() {
    if (baselineSubmittedRef.current) return
    baselineSubmittedRef.current = true
    api.me.annualTraining.submitBaseline(id, baselineSel)
      .then(r => { if (typeof r?.score === 'number' && typeof r?.total === 'number') setBaselineResult({ score: r.score, total: r.total }) })
      .catch(() => {})
  }
  function saveReflection() {
    const text = reflectionText.trim()
    if (!text || reflectionSaving) return
    setReflectionSaving(true); setReflectionSaved(false)
    api.me.annualTraining.saveReflection(id, text).then(() => setReflectionSaved(true)).catch(() => {}).finally(() => setReflectionSaving(false))
  }

  useEffect(() => {
    api.me.annualTraining.get(id).then(d => {
      setData(d)
      const s: Record<string, number> = {}
      for (const a of (d.answers ?? [])) { const idx = OPTION_LETTERS.indexOf(a.answer_text); if (idx >= 0) s[a.question_id] = idx }
      setSel(s)
      if (d.reflection) setReflectionText(d.reflection)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the second-language version once (on first use) and cache it, so flipping
  // a step is instant. Records the switch for analytics the first time.
  function ensureSecond() {
    if (!secondLang) return
    if (!data2 && !loadingSecond) {
      setLoadingSecond(true)
      api.me.annualTraining.get(id, '2').then(setData2).catch(() => {}).finally(() => setLoadingSecond(false))
    }
    createApiClient(token).me.recordLanguageSwitch({ area: switchArea, set_ref: id, set_name: name }).catch(() => {})
  }

  // The second-language aid is PER STEP: moving to another lesson step or into the
  // assessment reverts to the first language, so staff learn in their first language
  // by default and only dip into the second language on the step they're stuck on.
  useEffect(() => { setShowSecond(false) }, [step, phase])

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

  // Learn phase: the current step renders from the 2nd-language module when the
  // per-step switch is on (and it's loaded); otherwise the first language.
  const learnActive = (showSecond && data2) ? data2 : data
  const qs: any[] = data.questions ?? []                 // assessment order + ids (stable across languages)
  const q2ById: Record<string, any> = {}
  for (const q of (data2?.questions ?? [])) q2ById[q.id] = q  // per-question 2nd-language lookup
  const answered = qs.filter(q => sel[q.id] != null).length
  const sections: any[] = Array.isArray(learnActive.learning?.sections) ? learnActive.learning.sections : []
  // Interactive activities, in addition to the sections — a course without any
  // behaves exactly as it always has.
  const activities: HubActivity[] = Array.isArray(learnActive.activities) ? learnActive.activities : []

  // Result
  if (result) {
    // Baseline score for the learning-gain line: prefer the score returned when the
    // learner submitted this session, else the one already stored on the enrollment.
    const gain = baselineResult ?? ((data.baseline && data.baseline.score != null && data.baseline.total != null) ? { score: data.baseline.score as number, total: data.baseline.total as number } : null)
    return (
      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto max-w-md text-center">
          {result.passed ? (
            <>
              <Award size={44} className="mx-auto mb-3 text-green-500" />
              <h2 className="text-xl font-bold text-neutral-dark">Passed — {result.score}%</h2>
              <p className="mt-1 text-sm text-neutral-mid">You scored {result.correct}/{result.total}. Your certificate is ready.</p>
              {gain && (
                <div className="mx-auto mt-3 max-w-sm rounded-lg border border-teal/20 bg-teal-light/20 p-2.5 text-xs text-neutral-dark">
                  <span className="font-semibold text-teal">Learning gain: </span>before this course you scored {gain.score} of {gain.total} on the quick check. You have just passed with {result.score}%.
                </div>
              )}
              {data.requires_practical && <p className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">Remember: this topic also needs a practical/observed assessment with your manager.</p>}

              {/* Post-completion evaluation */}
              {!evalDone ? (
                <div className="mx-auto mt-5 max-w-sm rounded-xl border border-gray-200 bg-white p-4 text-left">
                  <p className="mb-3 text-center text-sm font-semibold text-neutral-dark">Quick feedback (optional)</p>
                  <Scale label="How confident do you feel using this in your work?" low="Not at all" high="Very confident" value={evalConfidence} onChange={setEvalConfidence} />
                  <Scale label="How useful was this training for your role?" low="Not useful" high="Very useful" value={evalUsefulness} onChange={setEvalUsefulness} />
                  <textarea value={evalComment} onChange={e => setEvalComment(e.target.value)} rows={2} placeholder="Anything unclear or that you'd change? (optional)" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
                  <div className="mt-3 flex justify-center gap-2">
                    <button onClick={submitEval} disabled={evalConfidence == null && evalUsefulness == null && !evalComment.trim()} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">Submit feedback</button>
                    <button onClick={() => setEvalDone(true)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Skip</button>
                  </div>
                </div>
              ) : (
                <p className="mx-auto mt-4 max-w-sm text-xs text-neutral-mid">Thanks for your feedback.</p>
              )}

              {/* Reflective practice — optional, non-blocking */}
              <div className="mx-auto mt-4 max-w-sm rounded-xl border border-gray-200 bg-white p-4 text-left">
                <p className="mb-1 text-sm font-semibold text-neutral-dark">Reflective practice</p>
                <p className="mb-2 text-xs text-neutral-mid">What will you do differently in your day to day work after this course?</p>
                <textarea
                  value={reflectionText}
                  onChange={e => { setReflectionText(e.target.value); setReflectionSaved(false) }}
                  rows={3}
                  maxLength={1500}
                  placeholder="A sentence or two is plenty (optional)"
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={saveReflection} disabled={reflectionSaving || !reflectionText.trim()} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                    {reflectionSaving ? 'Saving…' : 'Save reflection'}
                  </button>
                  {reflectionSaved && <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Saved</span>}
                </div>
              </div>

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
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => onExit(false)} className="inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> {backLabel}</button>
          {secondLang && phase === 'learn' && (
            <button
              type="button"
              onClick={() => { if (!showSecond) ensureSecond(); setShowSecond(s => !s) }}
              disabled={!showSecond && loadingSecond}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${showSecond ? 'border-teal bg-teal text-white' : 'border-teal/40 text-teal hover:bg-teal-light/40'}`}
              title={showSecond ? 'Back to your first language' : `Show just this step in ${secondLang.name} to help you understand it`}
            >
              <Globe size={12} /> {(!showSecond && loadingSecond) ? 'Loading…' : showSecond ? '1st language' : `This step in ${secondLang.name}`}
            </button>
          )}
        </div>
        <h2 className="text-lg font-bold text-neutral-dark">{data.name || name}</h2>

        {data.requires_practical && (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span>This is the <strong>knowledge</strong> part. This topic also needs a practical/observed assessment with your manager.</span>
          </div>
        )}

        {/* Related policies — ask specific questions (accordion) */}
        {onTalkToPolicy && Array.isArray(data.policies) && data.policies.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border-2 border-teal/40 bg-gradient-to-br from-teal-light/40 to-white shadow-sm">
            <button onClick={() => setPoliciesOpen(o => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-light/20">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/15"><MessageSquare size={17} className="text-teal" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-dark">Ask about the policies behind this training</span>
                <span className="block text-xs text-neutral-mid">{data.policies.length} related polic{data.policies.length === 1 ? 'y' : 'ies'} · tap to ask questions in your language</span>
              </span>
              <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-teal px-2.5 text-xs font-semibold text-white">{data.policies.length} {policiesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
            </button>
            {policiesOpen && (
              <div className="border-t border-teal/20 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {data.policies.map((p: any) => (
                    <button key={p.policy_id} onClick={() => onTalkToPolicy(p.policy_id, p.title)} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-white px-3 py-1.5 text-xs font-medium text-teal transition-colors hover:bg-teal hover:text-white">
                      <FileText size={12} /> {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learn — one step at a time: overview → (per section: teach → check) → assessment */}
        {phase === 'learn' && (() => {
          // Flat list of lesson steps. Each section becomes a teaching step and, if it
          // has one, a separate quick-check step (keeping the same section image).
          // A pre-lesson baseline check (if set on the module and not yet done) sits
          // between the overview and the first section.
          type LStep = { type: 'overview' } | { type: 'baseline' } | { type: 'teach'; i: number } | { type: 'check'; i: number } | { type: 'activity'; i: number }
          const baselineQs: any[] = (data.status !== 'complete' && data.baseline?.done === false && Array.isArray(data.baseline?.questions)) ? data.baseline.questions : []
          const lessonSteps: LStep[] = [{ type: 'overview' }]
          if (baselineQs.length > 0) lessonSteps.push({ type: 'baseline' })
          sections.forEach((sc: any, i: number) => {
            lessonSteps.push({ type: 'teach', i })
            if (sc.check?.question && Array.isArray(sc.check.options) && sc.check.options.length > 0) lessonSteps.push({ type: 'check', i })
            // Activities pinned to this section follow its teaching and quick check.
            activities.forEach((a, ai) => { if (a.after_section === i) lessonSteps.push({ type: 'activity', i: ai }) })
          })
          // Anything not pinned to a section (or pinned past the end) closes the lesson.
          activities.forEach((a, ai) => {
            const pinned = a.after_section != null && a.after_section < sections.length
            if (!pinned) lessonSteps.push({ type: 'activity', i: ai })
          })
          const totalStages = lessonSteps.length + 1   // + assessment
          const idx         = Math.min(step, lessonSteps.length - 1)
          const cur         = lessonSteps[idx]
          const isLastLearn = idx >= lessonSteps.length - 1
          const progressPct = Math.round((idx / totalStages) * 100)
          const sec         = (cur.type === 'teach' || cur.type === 'check') ? sections[cur.i] : null
          const picked      = sec ? checkSel[sec.id] : undefined
          // On a quick-check step, the learner must answer before they can move on.
          // On the baseline step, every question needs an answer first.
          const baselineAnswered = baselineQs.filter((q: any) => baselineSel[q.id] != null).length
          const curAct = cur.type === 'activity' ? activities[cur.i] : null
          const needsAnswer = (cur.type === 'check' && picked === undefined)
            || (cur.type === 'baseline' && baselineAnswered < baselineQs.length)
            || (!!curAct && !actDone[curAct.id])
          const isRight     = sec ? picked === sec.check?.correct : false
          const label       = cur.type === 'overview' ? 'Overview'
            : cur.type === 'baseline' ? 'Before you start'
            : cur.type === 'activity' ? 'Try it yourself'
            : cur.type === 'teach' ? `Section ${cur.i + 1} of ${sections.length}`
            : `Section ${cur.i + 1} — quick check`

          return (
            <div className="mt-4">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-mid">
                  <span className={`font-medium ${curAct ? 'text-amber-brand' : 'text-neutral-dark'}`}>{label}</span>
                  <span>{progressPct}% complete</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-2 rounded-full bg-teal transition-all duration-300" style={{ width: `${progressPct}%` }} /></div>
              </div>

              {cur.type === 'overview' ? (
                /* ── Overview ── */
                <>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {learnActive.illustration_url && <img src={apiAssetUrl(learnActive.illustration_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />}
                  <div className="p-5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal"><BookOpen size={13} /> Learning — what to read first</p>
                      {learnActive.duration_minutes ? <span className="inline-flex items-center gap-1 rounded-full bg-neutral-light px-2 py-0.5 text-[11px] font-medium text-neutral-mid"><Clock size={11} /> About {learnActive.duration_minutes} min</span> : null}
                    </div>
                    {(() => {
                      // Read the on-screen headings too, so the bullets don't
                      // arrive with no idea what they are a list of.
                      const overviewText = speakOverview({
                        summary:   learnActive.learning?.summary,
                        outcomes:  Array.isArray(learnActive.learning?.outcomes) ? learnActive.learning.outcomes : [],
                        keyPoints: sections.length === 0 && Array.isArray(learnActive.learning?.key_points) ? learnActive.learning.key_points : [],
                      })
                      return <div className="mb-3"><ListenButton token={token} text={overviewText} /></div>
                    })()}
                    {(() => {
                      const ov = learnActive?.can_suggest ? learnActive.source_overview : null
                      const editable = !!(learnActive?.can_suggest && ov)
                      const lc = learnActive?.lang_code
                      return (<>
                        {learnActive.learning?.summary && (
                          <p className="text-sm text-neutral-dark">
                            <InlineEditableText token={token} langCode={lc} contextLabel={`${name} — lesson`} source={ov?.summary ?? ''} current={learnActive.learning.summary} kind="lesson" editable={editable} />
                          </p>
                        )}
                        {Array.isArray(learnActive.learning?.outcomes) && learnActive.learning.outcomes.length > 0 && (
                          <div className="mt-3 rounded-lg bg-neutral-light/50 p-3">
                            <p className="mb-1.5 text-xs font-semibold text-neutral-dark">What you&apos;ll be able to do</p>
                            <ul className="space-y-1">
                              {learnActive.learning.outcomes.map((o: string, i: number) => <li key={i} className="flex gap-2 text-sm text-neutral-dark"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" /><InlineEditableText token={token} langCode={lc} contextLabel={`${name} — lesson`} source={ov?.outcomes?.[i] ?? ''} current={o} kind="lesson" editable={editable} /></li>)}
                            </ul>
                          </div>
                        )}
                        {sections.length === 0 && Array.isArray(learnActive.learning?.key_points) && learnActive.learning.key_points.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {learnActive.learning.key_points.map((p: string, i: number) => <li key={i} className="flex gap-2 text-sm text-neutral-dark"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" /><InlineEditableText token={token} langCode={lc} contextLabel={`${name} — lesson`} source={ov?.key_points?.[i] ?? ''} current={p} kind="lesson" editable={editable} /></li>)}
                          </ul>
                        )}
                      </>)
                    })()}
                  </div>
                </div>

                {/* Key terms — collapsed by default */}
                {Array.isArray(data.glossary) && data.glossary.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button onClick={() => setTermsOpen(o => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-light/40">
                      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><BookOpen size={15} className="text-teal" /> Key terms</span>
                      {termsOpen ? <ChevronUp size={15} className="text-neutral-mid" /> : <ChevronDown size={15} className="text-neutral-mid" />}
                    </button>
                    {termsOpen && (
                      <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                        {data.glossary.map((g: any, i: number) => (
                          <div key={i}>
                            <p className="text-sm font-semibold text-neutral-dark">{g.term}</p>
                            <p className="mt-0.5 text-sm text-neutral-mid">{g.definition}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* References and further reading — collapsed by default */}
                {Array.isArray(data.references) && data.references.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button onClick={() => setRefsOpen(o => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-light/40">
                      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><FileText size={15} className="text-teal" /> References and further reading</span>
                      {refsOpen ? <ChevronUp size={15} className="text-neutral-mid" /> : <ChevronDown size={15} className="text-neutral-mid" />}
                    </button>
                    {refsOpen && (
                      <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                        {data.references.map((r: any, i: number) => (
                          <div key={i}>
                            {r.url
                              ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-teal hover:underline">{r.title}</a>
                              : <p className="text-sm font-medium text-neutral-dark">{r.title}</p>}
                            <p className="mt-0.5 text-xs text-neutral-mid">{r.source}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </>
              ) : cur.type === 'baseline' ? (
                /* ── Baseline knowledge check (before the lesson) ── */
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal"><Lightbulb size={13} /> Before you start</p>
                  {(() => {
                    const intro = `${baselineQs.length} quick questions before the lesson. They do not affect your result; they help show how much this course teaches you.`
                    return (<>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-bold text-neutral-dark">A quick knowledge check</p>
                        <ListenButton token={token} text={joinSpoken(['A quick knowledge check', intro])} className="mt-0.5" />
                      </div>
                      <p className="mb-4 mt-1 text-sm text-neutral-mid">{intro}</p>
                    </>)
                  })()}
                  <div className="space-y-4">
                    {baselineQs.map((q: any, qi: number) => (
                      <div key={q.id}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-neutral-dark">{qi + 1}. {q.text}</p>
                          {/* Reads the question and then each answer option by number */}
                          <ListenButton token={token} text={speakQuestion(q.text, q.options, { questionLabel: `Question ${qi + 1}` })} />
                        </div>
                        <div className="space-y-1.5">
                          {q.options.map((opt: string, oi: number) => (
                            <button key={oi} onClick={() => setBaselineSel(s => ({ ...s, [q.id]: oi }))}
                              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${baselineSel[q.id] === oi ? 'border-teal bg-teal-light/30 text-neutral-dark' : 'border-gray-200 text-neutral-dark hover:border-teal/50'}`}>
                              {baselineSel[q.id] === oi ? <CheckCircle2 size={14} className="shrink-0 text-teal" /> : <Circle size={14} className="shrink-0 text-gray-300" />}
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : curAct ? (
                /* ── Interactive activity — extra to the sections, never instead of them ── */
                <ActivityStep token={token} act={curAct} onAttempt={() => setActDone(d => ({ ...d, [curAct.id]: true }))} />
              ) : sec ? (
                /* ── Section step (teach OR check), same image on both ── */
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {sec.image_url && <img src={apiAssetUrl(sec.image_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />}
                  <div className="p-5">
                    {cur.type === 'teach' ? (
                      <>
                        {(() => {
                          const src = learnActive?.can_suggest ? learnActive.source_sections?.[cur.i] : null
                          const editable = !!(learnActive?.can_suggest && src)
                          return (<>
                            {sec.heading && (
                              <div className="mb-1.5 flex items-start justify-between gap-3">
                                <p className="text-base font-bold text-neutral-dark">
                                  <InlineEditableText token={token} langCode={learnActive?.lang_code} contextLabel={`${name} — lesson`} source={src?.heading ?? ''} current={sec.heading} kind="lesson" editable={editable} />
                                </p>
                                <ListenButton token={token} text={[sec.heading, sec.body].filter(Boolean).join('. ')} className="mt-0.5" />
                              </div>
                            )}
                            {sec.body && (
                              <p className="text-sm leading-relaxed text-neutral-dark">
                                <InlineEditableText token={token} langCode={learnActive?.lang_code} contextLabel={`${name} — lesson`} source={src?.body ?? ''} current={sec.body} kind="lesson" editable={editable} />
                              </p>
                            )}
                          </>)
                        })()}
                        {sec.scenario?.situation && (() => {
                          const ssrc = learnActive?.can_suggest ? learnActive.source_sections?.[cur.i] : null
                          const sedit = !!(learnActive?.can_suggest && ssrc)
                          const lc = learnActive?.lang_code
                          return (
                          <div className="mt-3 rounded-lg border border-teal/20 bg-teal-light/20 p-3">
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal"><Lightbulb size={12} /> In practice</p>
                              {/* The answer is only spoken once the learner has revealed it on screen */}
                              <ListenButton token={token} text={joinSpoken([
                                'In practice',
                                sec.scenario.situation,
                                sec.scenario.prompt,
                                revealed[sec.id] && sec.scenario.answer ? `The answer. ${sec.scenario.answer}` : null,
                              ])} />
                            </div>
                            <p className="text-sm text-neutral-dark"><InlineEditableText token={token} langCode={lc} contextLabel={`${name} — scenario`} source={ssrc?.situation ?? ''} current={sec.scenario.situation} kind="lesson" editable={sedit} /></p>
                            {sec.scenario.prompt && <p className="mt-1.5 text-sm font-medium text-neutral-dark"><InlineEditableText token={token} langCode={lc} contextLabel={`${name} — scenario`} source={ssrc?.prompt ?? ''} current={sec.scenario.prompt} kind="lesson" editable={sedit} /></p>}
                            {revealed[sec.id]
                              ? <p className="mt-2 rounded-md bg-white/70 p-2 text-sm text-neutral-dark"><span className="font-semibold text-teal">Answer: </span><InlineEditableText token={token} langCode={lc} contextLabel={`${name} — scenario`} source={ssrc?.answer ?? ''} current={sec.scenario.answer} kind="lesson" editable={sedit} /></p>
                              : sec.scenario.answer && <button onClick={() => setRevealed(r => ({ ...r, [sec.id]: true }))} className="mt-2 text-xs font-semibold text-teal hover:underline">Show the answer</button>}
                          </div>
                          )
                        })()}
                      </>
                    ) : (
                      <>
                        {sec.heading && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">{sec.heading}</p>}
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Lightbulb size={14} className="text-teal" /> Quick check</p>
                          <ListenButton token={token} text={speakQuestion(sec.check.question, sec.check.options, { lead: 'Quick check' })} className="mt-0.5" />
                        </div>
                        <p className="mb-2 text-sm font-medium text-neutral-dark">{sec.check.question}</p>
                        <div className="space-y-1.5">
                          {sec.check.options.map((opt: string, oi: number) => {
                            const chosen = picked === oi
                            const showState = picked != null && (oi === sec.check.correct || chosen)
                            const good = oi === sec.check.correct
                            return (
                              <button key={oi} onClick={() => picked == null && setCheckSel(c => ({ ...c, [sec.id]: oi }))} disabled={picked != null}
                                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${showState ? (good ? 'border-green-300 bg-green-50 text-neutral-dark' : 'border-red-300 bg-red-50 text-neutral-dark') : 'border-gray-200 text-neutral-dark hover:border-teal/50'} ${picked != null ? 'cursor-default' : ''}`}>
                                {showState ? (good ? <CheckCircle2 size={14} className="shrink-0 text-green-500" /> : chosen ? <AlertTriangle size={14} className="shrink-0 text-red-500" /> : <Circle size={14} className="shrink-0 text-gray-300" />) : <Circle size={14} className="shrink-0 text-gray-300" />}
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                        {picked != null && <p className={`mt-1.5 text-xs font-medium ${isRight ? 'text-green-600' : 'text-amber-600'}`}>{isRight ? 'Correct.' : 'Not quite — the right answer is highlighted.'}</p>}
                        {learnActive?.can_suggest && learnActive.source_sections?.[cur.i] && (
                          <SuggestTranslation token={token} langCode={learnActive.lang_code} contextLabel={`${name} — quick check`}
                            fields={[
                              { label: 'Question', source: learnActive.source_sections[cur.i].check_question, current: sec.check.question, kind: 'question', multiline: true },
                              ...(sec.check.options as string[]).map((o: string, oi: number) => ({ label: `Answer ${oi + 1}`, source: learnActive.source_sections[cur.i].check_options[oi], current: o, kind: 'option' })),
                            ]} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Navigation */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <button onClick={() => step === 0 ? onExit(false) : setStep(step - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                  <ChevronLeft size={15} /> {step === 0 ? 'Exit' : 'Back'}
                </button>
                {cur.type === 'baseline'
                  ? <button onClick={() => { submitBaselineAnswers(); if (isLastLearn) { flushLearnTime(); setPhase('assess') } else setStep(step + 1) }} disabled={needsAnswer} title={needsAnswer ? 'Answer every question to continue' : undefined} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40 disabled:hover:bg-teal">Continue to the lesson →</button>
                  : isLastLearn
                  ? <button onClick={() => { flushLearnTime(); setPhase('assess') }} disabled={needsAnswer} title={needsAnswer ? (curAct ? 'Have a go, then check your answers to continue' : 'Answer the question to continue') : undefined} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40 disabled:hover:bg-teal">Start assessment ({qs.length}) →</button>
                  : <button onClick={() => setStep(step + 1)} disabled={needsAnswer} title={needsAnswer ? (curAct ? 'Have a go, then check your answers to continue' : 'Answer the question to continue') : undefined} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40 disabled:hover:bg-teal">Next →</button>}
              </div>
            </div>
          )
        })()}

        {/* Assess */}
        {phase === 'assess' && (
          <div className="mt-4">
            {/* Progress bar — assessment */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-xs text-neutral-mid">
                <span className="font-medium text-neutral-dark">Assessment · pass mark {data.pass_mark}%</span>
                <span>{answered}/{qs.length} answered</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-2 rounded-full bg-teal transition-all duration-300" style={{ width: `${qs.length ? Math.round((answered / qs.length) * 100) : 0}%` }} /></div>
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-neutral-mid">
              <button onClick={() => setPhase('learn')} className="hover:text-teal">← Back to the lesson</button>
            </div>
            <div className="space-y-3">
              {qs.map((q, qi) => {
                // Per-question 2nd-language aid: flip just this question, others stay
                // in the first language. Options keep the same order across languages.
                const qd = (qLang[q.id] && q2ById[q.id]) ? q2ById[q.id] : q
                return (
                  <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-dark">{qi + 1}. {qd.text}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                      {/* Speaks whichever language is currently on screen for this question */}
                      <ListenButton token={token} text={speakQuestion(qd.text, qd.options, { questionLabel: `Question ${qi + 1}` })} />
                      {secondLang && (
                        <button
                          type="button"
                          onClick={() => { if (!qLang[q.id]) ensureSecond(); setQLang(m => ({ ...m, [q.id]: !m[q.id] })) }}
                          disabled={!qLang[q.id] && loadingSecond && !data2}
                          title={qLang[q.id] ? 'Back to your first language' : `Show this question in ${secondLang.name}`}
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${qLang[q.id] ? 'border-teal bg-teal text-white' : 'border-teal/40 text-teal hover:bg-teal-light/40'}`}
                        >
                          <Globe size={11} /> {qLang[q.id] ? '1st language' : secondLang.name}
                        </button>
                      )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {qd.options.map((opt: string, oi: number) => (
                        <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${sel[q.id] === oi ? 'border-teal bg-teal-light/30 text-neutral-dark' : 'border-gray-200 text-neutral-dark hover:border-teal/50'}`}>
                          <input type="radio" name={`q-${q.id}`} checked={sel[q.id] === oi} onChange={() => pick(q.id, oi)} className="accent-teal" />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {(() => {
                      // Suggest against whichever language is on screen for this
                      // question: the 2nd-language copy when flipped, else the 1st.
                      const activeQData = (qLang[q.id] && data2) ? data2 : data
                      const srcQ = activeQData?.source_questions?.[qi]
                      if (!activeQData?.can_suggest || !srcQ) return null
                      return (
                        <SuggestTranslation token={token} langCode={activeQData.lang_code} contextLabel={name}
                          fields={[
                            { label: 'Question', source: srcQ.text, current: qd.text, kind: 'question', multiline: true },
                            ...(qd.options as string[]).map((opt: string, oi: number) => ({ label: `Answer ${oi + 1}`, source: srcQ.options[oi], current: opt, kind: 'option' })),
                          ]} />
                      )
                    })()}
                  </div>
                )
              })}
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

export function CertView({ token, id, onExit, backLabel = 'Annual Training' }: { token: string; id: string; onExit: () => void; backLabel?: string }) {
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
          <button onClick={onExit} className="inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> {backLabel}</button>
          <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-dark hover:border-teal/40 hover:text-teal"><Printer size={14} /> Print / save PDF</button>
        </div>

        <TrainingCertificate
          staffName={c.staff_name}
          moduleName={c.module_name}
          orgName={c.org_name}
          orgLogoUrl={c.logo_url}
          score={c.score}
          completedAt={c.completed_at}
          expiresAt={c.expires_at}
          requiresPractical={c.requires_practical}
          cpdAccredited={c.cpd?.accredited}
          cpdHours={c.cpd?.hours}
          cpdProviderNumber={c.cpd?.provider_number}
          independentlyReviewed={c.independently_reviewed}
          baseline={c.baseline}
        />

        {/* Reflection sits under the certificate. Learning gain is now printed ON the
            cert-sheet itself — the print CSS isolates .cert-sheet, so anything out
            here is screen-only and would be lost from the saved PDF. */}
        {c.reflection && (
          <div className="mt-4 space-y-3">
            {c.reflection && (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal">Your reflection</p>
                <p className="whitespace-pre-wrap text-sm text-neutral-dark">{c.reflection}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
