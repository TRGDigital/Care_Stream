'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { AuthedImage } from '@/components/authed-image'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Printer, Sparkles, Loader2, AlertTriangle, Pause, Camera } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AnswerToggle({
  qType, ansYn, ansNa, onYn, onNa, disabled,
}: {
  qType: string; ansYn: boolean | null; ansNa: boolean
  onYn: (v: boolean) => void; onNa: () => void; disabled?: boolean
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onYn(true)}
        disabled={disabled}
        className={clsx(
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          ansYn === true && !ansNa
            ? 'bg-green-500 text-white'
            : 'border border-gray-200 text-neutral-mid hover:border-green-400 hover:text-green-600',
        )}
      >Yes</button>
      <button
        onClick={() => onYn(false)}
        disabled={disabled}
        className={clsx(
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          ansYn === false && !ansNa
            ? 'bg-red-500 text-white'
            : 'border border-gray-200 text-neutral-mid hover:border-red-400 hover:text-red-500',
        )}
      >No</button>
      {qType === 'yes_no_na' && (
        <button
          onClick={onNa}
          disabled={disabled}
          className={clsx(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            ansNa
              ? 'bg-gray-400 text-white'
              : 'border border-gray-200 text-neutral-mid hover:border-gray-400 hover:text-neutral-dark',
          )}
        >N/A</button>
      )}
    </div>
  )
}

function ScoreBadge({ yes, total }: { yes: number; total: number }) {
  const pct   = total > 0 ? Math.round((yes / total) * 100) : 0
  const color = pct >= 80 ? 'text-green-600 bg-green-50' : pct >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {yes}/{total} ({pct}%)
    </span>
  )
}

// ─── Print view ───────────────────────────────────────────────────────────────

function PrintReport({ report }: { report: any }) {
  return (
    <div className="hidden print:block p-8 font-sans text-sm text-black">
      <h1 className="mb-1 text-2xl font-bold">{report.audit_name}</h1>
      <p className="mb-0.5 text-base">{report.organisation}</p>
      <table className="mb-4 w-full border-collapse text-xs">
        <tbody>
          <tr>
            <td className="border border-gray-300 px-2 py-1 font-semibold">Auditor</td>
            <td className="border border-gray-300 px-2 py-1">{report.auditor_name ?? ''}</td>
            <td className="border border-gray-300 px-2 py-1 font-semibold">Position</td>
            <td className="border border-gray-300 px-2 py-1">{report.auditor_role ?? ''}</td>
            <td className="border border-gray-300 px-2 py-1 font-semibold">Audit date</td>
            <td className="border border-gray-300 px-2 py-1">
              {new Date(report.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </td>
          </tr>
        </tbody>
      </table>

      {report.sections.map((section: any) => {
        const hasYN = section.questions.some((q: any) => q.question_type === 'yes_no' || q.question_type === 'yes_no_na')
        return (
          <div key={section.title} className="mb-4">
            <h2 className="mb-1 bg-gray-100 px-2 py-1 text-sm font-bold uppercase">{section.title}</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">Auditing task</th>
                  {hasYN && <th className="w-8 border border-gray-300 px-2 py-1 text-center">Yes</th>}
                  {hasYN && <th className="w-8 border border-gray-300 px-2 py-1 text-center">No</th>}
                  {hasYN && <th className="w-8 border border-gray-300 px-2 py-1 text-center">N/A</th>}
                  <th className="border border-gray-300 px-2 py-1 text-left">{hasYN ? 'Outcome of audit' : 'Findings'}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Actions to be taken</th>
                </tr>
              </thead>
              <tbody>
                {section.questions.map((q: any) => {
                  const isYN = q.question_type === 'yes_no' || q.question_type === 'yes_no_na'
                  return (
                    <tr key={q.id}>
                      <td className="border border-gray-300 px-2 py-1">{q.question}</td>
                      {hasYN && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_yn === true  && !q.answer_na ? '✓' : ''}</td>}
                      {hasYN && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_yn === false && !q.answer_na ? '✓' : ''}</td>}
                      {hasYN && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_na ? '✓' : ''}</td>}
                      <td className="border border-gray-300 px-2 py-1">{q.outcome_text ?? ''}</td>
                      <td className="border border-gray-300 px-2 py-1">{q.question_type === 'free_text' ? '' : (q.actions_text ?? '')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <div className="mt-6 border border-gray-300 p-3">
        <h2 className="mb-2 text-sm font-bold uppercase">Audit Summary</h2>
        <p className="font-semibold">Strengths identified:</p>
        <p className="mb-3 min-h-[40px]">{report.strengths ?? ''}</p>
        <p className="font-semibold">Areas requiring improvement:</p>
        <p className="mb-3 min-h-[40px]">{report.improvements ?? ''}</p>
        <p className="font-semibold">Deadline for actions:</p>
        <p>{report.actions_deadline ?? ''}</p>
      </div>

      {report.ai_recommendations && (
        <div className="mt-6 border border-gray-300 p-3">
          <h2 className="mb-2 text-sm font-bold uppercase">AI Recommendations</h2>
          <pre className="whitespace-pre-wrap text-xs">{report.ai_recommendations}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditRunPage() {
  const { data: session }           = useSession()
  const { id }                      = useParams<{ id: string }>()
  const router                      = useRouter()
  const [run,       setRun]         = useState<any>(null)
  const [answers,   setAnswers]     = useState<Map<string, { answer_yn: boolean|null; answer_na: boolean; outcome_text: string; actions_text: string }>>(new Map())
  const [summary,   setSummary]     = useState({ strengths: '', improvements: '', actions_deadline: '' })
  const [loading,   setLoading]     = useState(true)
  const [section,   setSection]     = useState(0)
  const [saving,    setSaving]      = useState(false)
  const [completing, setCompleting] = useState(false)
  const [report,    setReport]      = useState<any>(null)
  const [evidence,  setEvidence]    = useState<Map<string, any[]>>(new Map())
  const saveTimer                   = useRef<NodeJS.Timeout>()

  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  // Load run
  useEffect(() => {
    if (!api) return
    api.audits.getRun(id).then(({ run: r }) => {
      setRun(r)
      // Hydrate answers from saved data
      const map = new Map<string, any>()
      for (const a of r.answers) {
        map.set(a.question_id, {
          answer_yn:    a.answer_yn    ?? null,
          answer_na:    a.answer_na    ?? false,
          outcome_text: a.outcome_text ?? '',
          actions_text: a.actions_text ?? '',
        })
      }
      setAnswers(map)
      const evMap = new Map<string, any[]>()
      for (const e of (r.evidence ?? [])) { const arr = evMap.get(e.question_id) ?? []; arr.push(e); evMap.set(e.question_id, arr) }
      setEvidence(evMap)
      setSummary({
        strengths:        r.strengths        ?? '',
        improvements:     r.improvements     ?? '',
        actions_deadline: r.actions_deadline ?? '',
      })
      if (r.status === 'completed') {
        api.audits.report(id).then(({ report: rpt }) => setReport(rpt)).catch(() => {})
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id, session?.accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save
  const scheduleAutoSave = useCallback((qId: string, value: any) => {
    if (!api) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await api.audits.saveAnswers(id, [{ question_id: qId, ...value }]).catch(() => {})
      setSaving(false)
    }, 600)
  }, [id, api]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateAnswer(qId: string, field: 'answer_yn' | 'answer_na' | 'outcome_text' | 'actions_text', value: any) {
    setAnswers(prev => {
      const existing = prev.get(qId) ?? { answer_yn: null, answer_na: false, outcome_text: '', actions_text: '' }
      // Selecting Yes/No clears N/A; selecting N/A clears Yes/No
      const patch = field === 'answer_yn'
        ? { answer_yn: value, answer_na: false }
        : field === 'answer_na'
          ? { answer_na: value, answer_yn: null }
          : { [field]: value }
      const updated = { ...existing, ...patch }
      const next    = new Map(prev)
      next.set(qId, updated)
      scheduleAutoSave(qId, updated)
      return next
    })
  }

  async function saveSummary() {
    if (!api) return
    await api.audits.updateRun(id, summary).catch(() => {})
  }

  async function completeAudit() {
    if (!api) return
    setCompleting(true)
    await saveSummary()
    try {
      const { run: completed } = await api.audits.complete(id)
      setRun(completed)
      const { report: rpt } = await api.audits.report(id)
      setReport(rpt)
    } catch {
      // show error
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-mid">Loading audit…</p>
  if (!run)    return <p className="text-sm text-status-error">Audit not found.</p>

  const isCompleted   = run.status === 'completed'
  const sections      = run.template.sections
  const allQuestions  = sections.flatMap((s: any) => s.questions)
  // Only yes/no questions are mandatory for progress — findings/free_text are always considered answered
  const ynQuestions   = allQuestions.filter((q: any) => q.question_type === 'yes_no' || q.question_type === 'yes_no_na')
  const answeredCount = ynQuestions.filter((q: any) => {
    const a = answers.get(q.id)
    return a?.answer_na === true || (a?.answer_yn !== null && a?.answer_yn !== undefined)
  }).length
  const totalQ   = ynQuestions.length
  const progress = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 100

  const currentSection = sections[section]
  const yesCount = currentSection?.questions.filter((q: any) => answers.get(q.id)?.answer_yn === true && !answers.get(q.id)?.answer_na).length ?? 0
  const ynCount  = currentSection?.questions.filter((q: any) => q.question_type === 'yes_no' || q.question_type === 'yes_no_na').length ?? 0

  return (
    <div>
      {/* Print-only report */}
      {report && <PrintReport report={report} />}

      {/* Screen view */}
      <div className="print:hidden">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <button
            onClick={() => router.push('/audits')}
            className="flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"
          >
            <ChevronLeft size={14} /> Audits
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-neutral-dark">{run.template.name}</h1>
            <p className="text-sm text-neutral-mid">
              {new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              {run.auditor_name && ` · ${run.auditor_name}`}
              {run.auditor_role && ` (${run.auditor_role})`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-neutral-mid">Saving…</span>}
            {!isCompleted && (
              <button
                onClick={() => router.push('/audits')}
                className="flex items-center gap-2 rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal hover:text-teal"
              >
                <Pause size={14} /> Save &amp; exit
              </button>
            )}
            {isCompleted && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal hover:text-teal"
              >
                <Printer size={14} /> Print / save
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 rounded-card bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-mid">
            <span>{answeredCount} of {totalQ} questions answered</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={clsx('h-2 rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-teal')}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Section tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {sections.map((s: any, i: number) => {
            const sectionYes   = s.questions.filter((q: any) => answers.get(q.id)?.answer_yn === true && !answers.get(q.id)?.answer_na).length
            const sectionTotal = s.questions.length
            const sectionDone  = s.questions.filter((q: any) => {
              const a = answers.get(q.id)
              if (q.question_type === 'findings' || q.question_type === 'free_text') return true
              return a?.answer_na === true || (a?.answer_yn !== null && a?.answer_yn !== undefined)
            }).length
            return (
              <button
                key={s.id}
                onClick={() => setSection(i)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  section === i
                    ? 'bg-teal text-white'
                    : 'border border-gray-200 text-neutral-mid hover:border-teal hover:text-teal',
                )}
              >
                {sectionDone === sectionTotal
                  ? <CheckCircle2 size={11} className={section === i ? 'text-white' : 'text-green-500'} />
                  : <Circle size={11} />
                }
                <span className="hidden sm:inline">Section {i + 1}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            )
          })}
          <button
            onClick={() => setSection(sections.length)}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              section === sections.length
                ? 'bg-teal text-white'
                : 'border border-gray-200 text-neutral-mid hover:border-teal hover:text-teal',
            )}
          >
            Summary
          </button>
        </div>

        {/* Section content */}
        {section < sections.length && (
          <div className="rounded-card bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-semibold text-neutral-dark">{currentSection.title}</h2>
                <p className="text-xs text-neutral-mid">{currentSection.questions.length} auditing tasks</p>
              </div>
              {ynCount > 0 && <ScoreBadge yes={yesCount} total={ynCount} />}
            </div>

            <div className="divide-y divide-gray-50">
              {currentSection.questions.map((q: any, qi: number) => {
                const ans = answers.get(q.id) ?? { answer_yn: null, answer_na: false, outcome_text: '', actions_text: '' }
                const isYN = q.question_type === 'yes_no' || q.question_type === 'yes_no_na'
                const showFields = isYN
                  ? (ans.answer_yn !== null || ans.answer_na)
                  : true

                return (
                  <div key={q.id} className={clsx('px-6 py-5', isYN && ans.answer_yn === false && !ans.answer_na && 'bg-red-50/30')}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-dark">
                          <span className="mr-2 text-xs text-neutral-mid">{qi + 1}.</span>
                          {q.question_text}
                        </p>
                      </div>
                      {isYN && (
                        <AnswerToggle
                          qType={q.question_type}
                          ansYn={ans.answer_yn}
                          ansNa={ans.answer_na}
                          onYn={v => updateAnswer(q.id, 'answer_yn', v)}
                          onNa={() => updateAnswer(q.id, 'answer_na', !ans.answer_na)}
                          disabled={isCompleted}
                        />
                      )}
                    </div>

                    {showFields && (
                      <div className={clsx('mt-3 grid grid-cols-1 gap-3', !isYN || q.question_type === 'free_text' ? '' : 'sm:grid-cols-2')}>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-mid">
                            {q.question_type === 'findings' ? 'Findings' : 'Outcome of audit'}
                          </label>
                          <textarea
                            value={ans.outcome_text}
                            onChange={e => updateAnswer(q.id, 'outcome_text', e.target.value)}
                            onBlur={() => api?.audits.saveAnswers(id, [{ question_id: q.id, ...ans }]).catch(() => {})}
                            disabled={isCompleted}
                            placeholder={q.question_type === 'findings' ? 'Findings…' : 'Notes on what was found…'}
                            rows={q.question_type === 'free_text' ? 4 : 2}
                            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder-gray-300 focus:border-teal focus:outline-none disabled:bg-gray-50"
                          />
                        </div>
                        {q.question_type !== 'free_text' && (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-mid">
                              {q.question_type === 'findings' ? 'Actions & Timescales' : 'Actions to be taken'}
                            </label>
                            <textarea
                              value={ans.actions_text}
                              onChange={e => updateAnswer(q.id, 'actions_text', e.target.value)}
                              onBlur={() => api?.audits.saveAnswers(id, [{ question_id: q.id, ...ans }]).catch(() => {})}
                              disabled={isCompleted}
                              placeholder="Actions required…"
                              rows={2}
                              className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder-gray-300 focus:border-teal focus:outline-none disabled:bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evidence photos captured during the audit */}
                    {(() => {
                      const evs = evidence.get(q.id) ?? []
                      if (evs.length === 0) return null
                      return (
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-mid"><Camera size={13} /> Evidence ({evs.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {evs.map((ev: any) => (
                              <AuthedImage
                                key={ev.id}
                                id={ev.id}
                                load={() => api!.audits.evidenceBlob(ev.id)}
                                alt={ev.file_name}
                                onClick={() => api!.audits.evidenceBlob(ev.id).then(b => window.open(URL.createObjectURL(b), '_blank', 'noopener')).catch(() => {})}
                                className="h-20 w-20 cursor-pointer rounded-lg object-cover ring-1 ring-gray-200 hover:ring-teal"
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <button
                onClick={() => setSection(s => Math.max(0, s - 1))}
                disabled={section === 0}
                className="flex items-center gap-1 text-sm text-neutral-mid hover:text-teal disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setSection(s => s + 1)}
                className="flex items-center gap-1 text-sm text-teal hover:text-teal-dark"
              >
                {section < sections.length - 1 ? 'Next section' : 'Go to summary'} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Summary section */}
        {section === sections.length && (
          <div className="space-y-4">
            <div className="rounded-card bg-white p-6 shadow-card">
              <h2 className="mb-4 font-semibold text-neutral-dark">Audit summary</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Strengths identified</label>
                  <textarea
                    value={summary.strengths}
                    onChange={e => setSummary(s => ({ ...s, strengths: e.target.value }))}
                    onBlur={saveSummary}
                    disabled={isCompleted}
                    placeholder="What areas of practice were strong?"
                    rows={3}
                    className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder-gray-300 focus:border-teal focus:outline-none disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Areas requiring improvement</label>
                  <textarea
                    value={summary.improvements}
                    onChange={e => setSummary(s => ({ ...s, improvements: e.target.value }))}
                    onBlur={saveSummary}
                    disabled={isCompleted}
                    placeholder="What needs attention or improvement?"
                    rows={3}
                    className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder-gray-300 focus:border-teal focus:outline-none disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Deadline for actions</label>
                  <input
                    type="text"
                    value={summary.actions_deadline}
                    onChange={e => setSummary(s => ({ ...s, actions_deadline: e.target.value }))}
                    onBlur={saveSummary}
                    disabled={isCompleted}
                    placeholder="e.g. 30 June 2026"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder-gray-300 focus:border-teal focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Section score overview */}
            <div className="rounded-card bg-white p-6 shadow-card">
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Section scores</h2>
              <div className="space-y-2">
                {sections.map((s: any) => {
                  const ynQs  = s.questions.filter((q: any) => q.question_type === 'yes_no' || q.question_type === 'yes_no_na')
                  const yes   = ynQs.filter((q: any) => answers.get(q.id)?.answer_yn === true && !answers.get(q.id)?.answer_na).length
                  const total = ynQs.length
                  if (total === 0) return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-52 shrink-0 truncate text-xs text-neutral-mid">{s.title.replace(/^Section \d+: /, '')}</span>
                      <span className="text-xs text-neutral-mid/60">Narrative section</span>
                    </div>
                  )
                  const pct   = Math.round((yes / total) * 100)
                  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : pct > 0 ? 'bg-red-400' : 'bg-gray-200'
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-52 shrink-0 truncate text-xs text-neutral-mid">{s.title.replace(/^Section \d+: /, '')}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
                        <div className={clsx('h-2 rounded-full', color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs font-medium text-neutral-dark">{yes}/{total} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Complete / AI recommendations */}
            {!isCompleted && (
              <div className="flex items-center justify-between rounded-card border border-teal/20 bg-teal/5 p-5">
                <div>
                  <p className="text-sm font-semibold text-neutral-dark">Ready to complete?</p>
                  <p className="text-xs text-neutral-mid">Completing the audit generates AI recommendations and locks the report for printing.</p>
                </div>
                <button
                  onClick={completeAudit}
                  disabled={completing || progress < 100}
                  className="flex items-center gap-2 rounded-btn bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  {completing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {completing ? 'Generating…' : 'Complete & get AI recommendations'}
                </button>
              </div>
            )}

            {progress < 100 && !isCompleted && (
              <p className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle size={13} />
                {totalQ - answeredCount} question{totalQ - answeredCount !== 1 ? 's' : ''} still unanswered — complete all before finishing the audit.
              </p>
            )}

            {/* AI Recommendations panel */}
            {run.ai_recommendations && (
              <div className="rounded-card bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-teal" />
                  <h2 className="font-semibold text-neutral-dark">AI Recommendations</h2>
                </div>
                <div className="prose prose-sm max-w-none text-neutral-dark [&_strong]:text-neutral-dark [&_p]:text-sm [&_ul]:text-sm [&_li]:text-sm">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-dark">{run.ai_recommendations}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
