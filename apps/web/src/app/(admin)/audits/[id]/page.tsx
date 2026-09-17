'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { AuthedImage } from '@/components/authed-image'
import { AuditRecs } from '@/components/audit-recs'
import { AuditActionPlan } from '@/components/admin/audit-action-plan'
import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Circle, Printer, Sparkles, Loader2, AlertTriangle, Pause, Camera, CornerDownRight, FileDown } from 'lucide-react'
import { QuestionInput, EMPTY_ANSWER, answerFromRow, type AuditAnswer } from '@/components/audits/question-input'
import { isAnswered, isNarrative, isScored, isYesNo, outcomeFor, visibleQuestionIds } from '@/lib/audit-questions'
import { SignaturePad } from '@/components/audits/signature-pad'
import { PreviousActionsPanel } from '@/components/audits/previous-actions-panel'
import { clsx } from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const AUDIT_SUBJECT_LABEL: Record<string, string> = { resident: 'Resident', staff: 'Staff', room: 'Room' }

function PrintReport({ report, signatures }: { report: any; signatures: { auditor?: string; manager?: string } }) {
  return (
    <div id="audit-print-area" className="hidden print:block p-8 font-sans text-sm text-black">
      <div className="mb-3 flex items-start justify-between gap-6 border-b-4 border-teal pb-2">
        <div className="min-w-0">
          <h1 className="mb-1 text-2xl font-bold text-neutral-dark">
            {report.audit_name}
            {report.subject ? ` — ${AUDIT_SUBJECT_LABEL[report.subject_scope ?? 'none'] ?? ''} ${report.subject}${report.subject_room ? ` (Room ${report.subject_room})` : ''}` : ''}
          </h1>
          <p className="text-base font-semibold text-teal-dark">{report.organisation}</p>
        </div>
        {report.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.logo_url} alt={`${report.organisation} logo`} className="h-14 w-auto max-w-[180px] shrink-0 object-contain" />
        )}
      </div>
      <table className="mb-4 w-full border-collapse text-xs">
        <tbody>
          <tr>
            <td className="border border-gray-300 bg-teal-light px-2 py-1 font-semibold">Auditor</td>
            <td className="border border-gray-300 px-2 py-1">{report.auditor_name ?? ''}</td>
            <td className="border border-gray-300 bg-teal-light px-2 py-1 font-semibold">Position</td>
            <td className="border border-gray-300 px-2 py-1">{report.auditor_role ?? ''}</td>
            <td className="border border-gray-300 bg-teal-light px-2 py-1 font-semibold">Audit date</td>
            <td className="border border-gray-300 px-2 py-1">
              {new Date(report.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              {report.template_version ? ` (audit version ${report.template_version})` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      {report.sections.map((section: any) => {
        const hasYN = section.questions.some((q: any) => !isNarrative(q.question_type))
        return (
          <div key={section.title} className="mb-4">
            <h2 className="mb-1 bg-teal px-2 py-1.5 text-sm font-bold uppercase text-white">{section.title}</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-teal-light px-2 py-1 text-left">Auditing task</th>
                  {hasYN && <th className="w-8 border border-gray-300 bg-teal-light px-2 py-1 text-center">Yes</th>}
                  {hasYN && <th className="w-8 border border-gray-300 bg-teal-light px-2 py-1 text-center">No</th>}
                  {hasYN && <th className="w-8 border border-gray-300 bg-teal-light px-2 py-1 text-center">N/A</th>}
                  <th className="border border-gray-300 bg-teal-light px-2 py-1 text-left">{hasYN ? 'Outcome of audit' : 'Findings'}</th>
                  <th className="border border-gray-300 bg-teal-light px-2 py-1 text-left">Actions to be taken</th>
                </tr>
              </thead>
              <tbody>
                {section.questions.map((q: any) => {
                  const isYN = isYesNo(q.question_type)
                  const typed = !isYN && !isNarrative(q.question_type)
                  return (
                    <tr key={q.id}>
                      <td className="border border-gray-300 bg-gray-50 px-2 py-1 font-medium">
                        {q.question}
                        {q.quality_statement && <span className="block text-[10px] font-normal text-neutral-mid">CQC: {q.quality_statement}</span>}
                      </td>
                      {hasYN && typed && (
                        <td colSpan={3} className={clsx('border border-gray-300 px-2 py-1 text-center', q.outcome === 'fail' && 'font-semibold text-red-700')}>{q.answer_text}</td>
                      )}
                      {hasYN && !typed && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_yn === true  && !q.answer_na ? '✓' : ''}</td>}
                      {hasYN && !typed && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_yn === false && !q.answer_na ? '✓' : ''}</td>}
                      {hasYN && !typed && <td className="border border-gray-300 px-2 py-1 text-center">{isYN && q.answer_na ? '✓' : ''}</td>}
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

      <div className="avoid-break mt-6 border border-gray-300 p-3">
        <h2 className="mb-2 border-b border-teal/30 pb-1 text-sm font-bold uppercase text-teal-dark">Audit Summary</h2>
        <p className="font-semibold">Strengths identified:</p>
        <p className="mb-3 min-h-[40px]">{report.strengths ?? ''}</p>
        <p className="font-semibold">Areas requiring improvement:</p>
        <p className="mb-3 min-h-[40px]">{report.improvements ?? ''}</p>
        <p className="font-semibold">Deadline for actions:</p>
        <p>{report.actions_deadline ?? ''}</p>
      </div>

      {(report.has_auditor_signature || report.approved_by_name) && (
        <div className="avoid-break mt-6 grid grid-cols-2 gap-4">
          {report.has_auditor_signature && (
            <div className="border border-gray-300 p-3">
              <h2 className="mb-2 border-b border-teal/30 pb-1 text-sm font-bold uppercase text-teal-dark">Auditor</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {signatures.auditor && <img src={signatures.auditor} alt="Auditor signature" className="h-16 w-auto" />}
              <p className="text-xs">Signed by <strong>{report.auditor_signed_name}</strong>{report.auditor_signed_at ? ` on ${new Date(report.auditor_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.</p>
            </div>
          )}
          {report.approved_by_name && (
            <div className="border border-gray-300 p-3">
              <h2 className="mb-2 border-b border-teal/30 pb-1 text-sm font-bold uppercase text-teal-dark">Manager sign-off</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {report.has_manager_signature && signatures.manager && <img src={signatures.manager} alt="Manager signature" className="h-16 w-auto" />}
              <p className="text-xs">
                Approved by <strong>{report.approved_by_name}</strong>{report.approved_by_role ? ` (${report.approved_by_role})` : ''}
                {report.approved_at ? ` on ${new Date(report.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
              </p>
            </div>
          )}
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
  const [answers,   setAnswers]     = useState<Map<string, AuditAnswer>>(new Map())
  const [qsNames,   setQsNames]     = useState<Record<string, { name: string; key_question: string }>>({})
  const [completeError, setCompleteError] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [signedName, setSignedName] = useState('')
  const [signatureUrls, setSignatureUrls] = useState<{ auditor?: string; manager?: string }>({})
  const [downloading, setDownloading] = useState(false)
  const [summary,   setSummary]     = useState({ strengths: '', improvements: '', actions_deadline: '' })
  const [loading,   setLoading]     = useState(true)
  const [section,   setSection]     = useState(0)
  const [saving,    setSaving]      = useState(false)
  const [completing, setCompleting] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [recsOpen,  setRecsOpen]    = useState(false)
  const [report,    setReport]      = useState<any>(null)
  const [evidence,  setEvidence]    = useState<Map<string, any[]>>(new Map())
  const saveTimer                   = useRef<NodeJS.Timeout>()
  // The signature box is only on the summary; leaving it clears the drawing, so clear what was captured too.
  useEffect(() => { setSignature(null) }, [section])

  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  // Load run
  useEffect(() => {
    if (!api) return
    api.audits.getRun(id).then(({ run: r, approval_required, quality_statements }) => {
      setRun(r)
      setApprovalRequired(!!approval_required)
      setQsNames(quality_statements ?? {})
      // Hydrate answers from saved data
      const map = new Map<string, AuditAnswer>()
      for (const a of r.answers) map.set(a.question_id, answerFromRow(a))
      setAnswers(map)
      const evMap = new Map<string, any[]>()
      for (const e of (r.evidence ?? [])) { const arr = evMap.get(e.question_id) ?? []; arr.push(e); evMap.set(e.question_id, arr) }
      setEvidence(evMap)
      setSummary({
        strengths:        r.strengths        ?? '',
        improvements:     r.improvements     ?? '',
        actions_deadline: r.actions_deadline ?? '',
      })
      setSignedName(r.auditor_name ?? '')
      if (r.status === 'completed') {
        api.audits.report(id).then(({ report: rpt }) => { setReport(rpt); loadSignatures(rpt) }).catch(() => {})
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id, session?.accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cover browser-menu / Cmd+P printing too: without the body class the app's
  // fixed-height shell clips the report to a single page.
  useEffect(() => {
    const on  = () => document.body.classList.add('printing-audit')
    const off = () => document.body.classList.remove('printing-audit')
    window.addEventListener('beforeprint', on)
    window.addEventListener('afterprint', off)
    return () => {
      window.removeEventListener('beforeprint', on)
      window.removeEventListener('afterprint', off)
      off()
    }
  }, [])

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

  function updateAnswer(qId: string, patch: Partial<AuditAnswer>) {
    setAnswers(prev => {
      const existing = prev.get(qId) ?? EMPTY_ANSWER
      const updated = { ...existing, ...patch }
      const next    = new Map(prev)
      next.set(qId, updated)
      scheduleAutoSave(qId, updated)
      return next
    })
  }

  // The server-built PDF report (the same one emailed to admins when the audit was completed).
  async function downloadPdf() {
    if (!api) return
    setDownloading(true)
    try {
      const blob = await api.audits.reportPdfBlob(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(report?.audit_name ?? 'audit').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch { /* ignore */ } finally { setDownloading(false) }
  }

  function loadSignatures(rpt: any) {
    if (!api) return
    const roles: Array<'auditor' | 'manager'> = []
    if (rpt?.has_auditor_signature) roles.push('auditor')
    if (rpt?.has_manager_signature) roles.push('manager')
    for (const role of roles) {
      api.audits.signatureBlob(id, role).then(b => setSignatureUrls(u => ({ ...u, [role]: URL.createObjectURL(b) }))).catch(() => {})
    }
  }

  async function saveSummary() {
    if (!api) return
    await api.audits.updateRun(id, summary).catch(() => {})
  }

  async function completeAudit() {
    if (!api) return
    setCompleting(true)
    // Flush EVERY answer to the DB before completing. The per-question autosave is debounced, so
    // the last action (e.g. classifying a No as compliant vs gap) may not have persisted yet — and
    // the AI recommendations are generated server-side from the stored answers. This guarantees the
    // report is built from exactly what's on screen, including the No classifications.
    clearTimeout(saveTimer.current)
    const allAnswers = Array.from(answers.entries()).map(([question_id, v]) => ({ question_id, ...v }))
    if (allAnswers.length) await api.audits.saveAnswers(id, allAnswers).catch(() => {})
    await saveSummary()
    setCompleteError('')
    try {
      // The auditor's signature is saved first; completion is refused below without one.
      if (!signature || !signedName.trim()) throw new Error('Sign and type your name before completing the audit.')
      await api.audits.signRun(id, signature, signedName.trim())
      await api.audits.complete(id)
      // Re-fetch the FULL run (the complete response is a bare update with no template relation,
      // which the page renders). This also picks up the fresh approval status for the banner.
      const { run: r, approval_required } = await api.audits.getRun(id)
      setRun(r)
      setApprovalRequired(!!approval_required)
      const { report: rpt } = await api.audits.report(id)
      setReport(rpt)
      loadSignatures(rpt)
    } catch (e: any) {
      setCompleteError(e?.message ?? 'The audit could not be completed. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-mid">Loading audit…</p>
  if (!run)    return <p className="text-sm text-status-error">Audit not found.</p>

  const isCompleted   = run.status === 'completed'
  // Questions hidden by a condition are not asked, so they are left out of progress and scores.
  const visibleIds    = visibleQuestionIds(run.template.sections, answers)
  const sections      = run.template.sections.map((s: any) => ({ ...s, questions: s.questions.filter((q: any) => visibleIds.has(q.id)) })).filter((s: any) => s.questions.length)
  const allQuestions  = sections.flatMap((s: any) => s.questions)
  // Findings and free text are optional; every other question must be answered.
  const required      = allQuestions.filter((q: any) => !isNarrative(q.question_type))
  const answeredCount = required.filter((q: any) => isAnswered(q, answers.get(q.id))).length
  const totalQ   = required.length
  const progress = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 100

  // Section score: passes out of scored questions that were answered other than N/A.
  const sectionScore = (qs: any[]) => {
    const scored = qs.filter((q: any) => isScored(q) && !['na', 'info'].includes(outcomeFor(q, answers.get(q.id))))
    return { pass: scored.filter((q: any) => outcomeFor(q, answers.get(q.id)) === 'pass').length, total: scored.length }
  }
  if (section > sections.length) setSection(sections.length)
  const currentSection = sections[section]
  const { pass: yesCount, total: ynCount } = sectionScore(currentSection?.questions ?? [])

  return (
    <div>
      {/* Print-only report */}
      {report && <PrintReport report={report} signatures={signatureUrls} />}

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
            <h1 className="text-xl font-bold text-neutral-dark">
              {run.template.name}
              {run.room_number && <span className="text-neutral-mid"> · {AUDIT_SUBJECT_LABEL[run.template?.subject_scope ?? 'none'] ?? ''} {run.room_number}{run.subject_room ? ` (Room ${run.subject_room})` : ''}</span>}
            </h1>
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
              <button onClick={downloadPdf} disabled={downloading}
                className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Download PDF
              </button>
            )}
            {isCompleted && (
              <button
                onClick={() => {
                  // Un-clip the fixed-height app shell so the report prints on
                  // as many pages as it needs (matches the staff-record flow).
                  const prevTitle = document.title
                  document.title = `${(report?.audit_name ?? 'audit').replace(/\s+/g, '-').toLowerCase()}-report`
                  document.body.classList.add('printing-audit')
                  const cleanup = () => {
                    document.body.classList.remove('printing-audit')
                    document.title = prevTitle
                    window.removeEventListener('afterprint', cleanup)
                  }
                  window.addEventListener('afterprint', cleanup)
                  window.print()
                }}
                className="flex items-center gap-2 rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal hover:text-teal"
              >
                <Printer size={14} /> Print / save
              </button>
            )}
          </div>
        </div>

        {/* Manager approval status */}
        {run.approval_status === 'pending_manager' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Awaiting manager approval.</span> This audit has been sent to your care manager in the hub to review and sign off{run.submitted_at ? `, submitted ${new Date(run.submitted_at).toLocaleDateString('en-GB')}` : ''}.
          </div>
        )}
        {run.approval_status === 'approved' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span className="font-semibold">Approved by {run.approved_by_name || 'the care manager'}{run.approved_by_role ? ` (${run.approved_by_role})` : ''}</span>{run.approved_at ? ` on ${new Date(run.approved_at).toLocaleDateString('en-GB')}` : ''}. This sign-off is saved to the audit record.
          </div>
        )}
        {run.approval_status === 'rejected' && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span className="font-semibold">Sent back by your care manager.</span>{run.approval_note ? ` “${run.approval_note}”` : ''} Amend the audit and complete it again to re-submit for approval.
          </div>
        )}

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

        {session?.accessToken && <PreviousActionsPanel token={session.accessToken} runId={id} readOnly={isCompleted} />}

        {/* Section tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {sections.map((s: any, i: number) => {
            const sectionTotal = s.questions.length
            const sectionDone  = s.questions.filter((q: any) => isAnswered(q, answers.get(q.id))).length
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
                const ans = answers.get(q.id) ?? EMPTY_ANSWER
                const narrative = isNarrative(q.question_type)
                const showFields = narrative || isAnswered(q, ans) || ans.answer_yn === false
                const out = outcomeFor(q, ans)
                const tag = q.quality_statement_id ? qsNames[q.quality_statement_id] : null

                return (
                  <div key={q.id} className={clsx('px-6 py-5', out === 'fail' && isAnswered(q, ans) ? 'bg-red-50/30' : ans.answer_yn === false && ans.no_compliant === null && !ans.answer_na ? 'bg-amber-50/40' : '', q.show_if && 'border-l-4 border-teal/30')}>
                    <div className="mb-3">
                      <p className="text-sm font-medium text-neutral-dark">
                        {q.show_if ? <CornerDownRight size={13} className="mr-1.5 inline text-teal" /> : <span className="mr-2 text-xs text-neutral-mid">{qi + 1}.</span>}
                        {q.question_text}
                      </p>
                      {tag && <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">CQC: {tag.name}</span>}
                    </div>
                    {!narrative && (
                      <QuestionInput q={q} a={ans} disabled={isCompleted} onChange={patch => updateAnswer(q.id, patch)} />
                    )}

                    {showFields && (
                      <div className={clsx('mt-3 grid grid-cols-1 gap-3', narrative ? '' : 'sm:grid-cols-2')}>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-mid">
                            {q.question_type === 'findings' ? 'Findings' : 'Outcome of audit'}
                          </label>
                          <textarea
                            value={ans.outcome_text}
                            onChange={e => updateAnswer(q.id, { outcome_text: e.target.value })}
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
                              onChange={e => updateAnswer(q.id, { actions_text: e.target.value })}
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
                  const { pass: yes, total } = sectionScore(s.questions)
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

            {!isCompleted && (
              <div className="rounded-card bg-white p-6 shadow-card">
                <h2 className="mb-1 text-sm font-semibold text-neutral-dark">Your signature</h2>
                <p className="mb-3 text-xs text-neutral-mid">Sign to confirm this audit is a true record. Your signature and the date are saved to the report.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SignaturePad onChange={setSignature} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-mid">Your name</span>
                    <input value={signedName} onChange={e => setSignedName(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
                  </label>
                </div>
              </div>
            )}

            {isCompleted && (report?.has_auditor_signature || report?.has_manager_signature) && (
              <div className="grid gap-4 rounded-card bg-white p-6 shadow-card sm:grid-cols-2">
                {report?.has_auditor_signature && (
                  <div>
                    <p className="text-xs font-medium text-neutral-mid">Auditor signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {signatureUrls.auditor && <img src={signatureUrls.auditor} alt="Auditor signature" className="my-1 h-16 w-auto" />}
                    <p className="text-xs text-neutral-dark">{report.auditor_signed_name}{report.auditor_signed_at ? `, ${new Date(report.auditor_signed_at).toLocaleDateString('en-GB')}` : ''}</p>
                  </div>
                )}
                {report?.has_manager_signature && (
                  <div>
                    <p className="text-xs font-medium text-neutral-mid">Manager signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {signatureUrls.manager && <img src={signatureUrls.manager} alt="Manager signature" className="my-1 h-16 w-auto" />}
                    <p className="text-xs text-neutral-dark">{report.approved_by_name}{report.manager_signed_at ? `, ${new Date(report.manager_signed_at).toLocaleDateString('en-GB')}` : ''}</p>
                  </div>
                )}
              </div>
            )}

            {/* Complete / AI recommendations */}
            {!isCompleted && (
              <div className="flex items-center justify-between rounded-card border border-teal/20 bg-teal/5 p-5">
                <div>
                  <p className="text-sm font-semibold text-neutral-dark">Ready to {approvalRequired ? 'send for approval' : 'complete'}?</p>
                  <p className="text-xs text-neutral-mid">
                    {approvalRequired
                      ? 'This sends the audit to your care manager in the hub to review and approve. The AI recommendations are generated once they sign it off.'
                      : 'Completing the audit generates AI recommendations and locks the report for printing.'}
                  </p>
                </div>
                <button
                  onClick={completeAudit}
                  disabled={completing || progress < 100 || !signature || !signedName.trim()}
                  className="flex items-center gap-2 rounded-btn bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  {completing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {completing ? (approvalRequired ? 'Sending…' : 'Generating…') : (approvalRequired ? 'Send to care manager for approval' : 'Complete & get AI recommendations')}
                </button>
              </div>
            )}

            {completeError && (
              <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} /> {completeError}</p>
            )}

            {progress < 100 && !isCompleted && (
              <p className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle size={13} />
                {totalQ - answeredCount} question{totalQ - answeredCount !== 1 ? 's' : ''} still unanswered — complete all before finishing the audit.
              </p>
            )}

            {/* AI Recommendations — collapsible */}
            {run.ai_recommendations && (
              <div className="overflow-hidden rounded-card bg-white shadow-card">
                <button onClick={() => setRecsOpen(o => !o)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
                  <Sparkles size={16} className="shrink-0 text-teal" />
                  <h2 className="font-semibold text-neutral-dark">AI Recommendations</h2>
                  <ChevronDown size={16} className={clsx('ml-auto shrink-0 text-neutral-mid transition-transform', !recsOpen && '-rotate-90')} />
                </button>
                {recsOpen && (
                  <div className="px-6 pb-6">
                    <div className="rounded-lg border border-gray-100 bg-neutral-light/40 p-4">
                      <AuditRecs text={run.ai_recommendations} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {session?.accessToken && <AuditActionPlan token={session.accessToken} runId={id} canGenerate={isCompleted && !!run.ai_recommendations} />}
          </div>
        )}
      </div>
    </div>
  )
}
