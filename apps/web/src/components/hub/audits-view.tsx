'use client'

// Hub Audits — admin-role staff can start, save and complete audits from the
// Chat Hub. Uses the same /audits API + tables as the admin site, so completed
// runs appear in the site's Audit section automatically.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { AuditRecs } from '@/components/audit-recs'
import { CqcReadinessCard } from '@/components/admin/cqc-readiness-card'
import { persistentCache, hubKey } from '@/lib/page-cache'
import { useIsMobileOrTablet } from '@/lib/use-device'
import { compressImage } from '@/lib/image-compress'
import { AuthedImage } from '@/components/authed-image'
import {
  ClipboardCheck, ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2,
  Sparkles, Play, Pause, Plus, Camera, X, CornerDownRight,
} from 'lucide-react'
import { QuestionInput, EMPTY_ANSWER, answerFromRow, type AuditAnswer } from '@/components/audits/question-input'
import { isAnswered as questionAnswered, isNarrative, visibleQuestionIds } from '@/lib/audit-questions'

type Answer = AuditAnswer

const FREQ_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']
const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }

// Monthly/weekly runs are dated the 1st; daily runs are a specific day.
function periodLabel(audit_month: string | Date) {
  const d = new Date(audit_month)
  return d.getDate() === 1
    ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isAnswered(q: any, a?: Answer) { return questionAnswered(q, a) }

export function AuditsView({ token, userId }: { token: string; userId: string }) {
  const api = createApiClient(token)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  if (activeRunId) {
    return <AuditRunner token={token} runId={activeRunId} onExit={() => setActiveRunId(null)} />
  }
  return <AuditList api={api} token={token} userId={userId} onOpen={setActiveRunId} />
}

// ─── List: templates to start, in-progress to resume, recent completed ─────────

const SUBJECT_LABEL: Record<string, string> = { resident: 'Resident', staff: 'Staff', room: 'Room' }

function AuditList({ api, token, userId, onOpen }: { api: ReturnType<typeof createApiClient>; token: string; userId: string; onOpen: (runId: string) => void }) {
  const ck = hubKey('audits', userId)
  const cached = persistentCache.get<{ templates: any[]; runs: any[]; rooms: string[]; staff: string[]; recentSubjects: Record<string, string[]>; stats: any }>(ck)
  const [templates, setTemplates] = useState<any[]>(cached?.templates ?? [])
  const [runs,      setRuns]      = useState<any[]>(cached?.runs ?? [])
  const [rooms,     setRooms]     = useState<string[]>(cached?.rooms ?? [])
  const [staff,     setStaff]     = useState<string[]>(cached?.staff ?? [])
  const [recentSubjects, setRecentSubjects] = useState<Record<string, string[]>>(cached?.recentSubjects ?? {})
  const [stats,     setStats]     = useState<any>(cached?.stats ?? null)
  const [roomInput, setRoomInput] = useState<Record<string, string>>({})
  const [subjectRoomInput, setSubjectRoomInput] = useState<Record<string, string>>({})
  const [loading,   setLoading]   = useState(!cached)
  const [starting,  setStarting]  = useState<string | null>(null)
  const [assigned,  setAssigned]  = useState<any[]>([])

  function load() {
    api.audits.assignments({ view: 'open', mine: true }).then(d => setAssigned(d.assignments)).catch(() => {})
    Promise.all([api.audits.templates(), api.audits.runs(), api.audits.stats()])
      .then(([t, r, s]) => { setTemplates(t.templates ?? []); setRooms(t.rooms ?? []); setStaff(t.staff ?? []); setRecentSubjects(t.recent_subjects ?? {}); setRuns(r.runs ?? []); setStats(s); persistentCache.set(ck, { templates: t.templates ?? [], runs: r.runs ?? [], rooms: t.rooms ?? [], staff: t.staff ?? [], recentSubjects: t.recent_subjects ?? {}, stats: s }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function start(templateId: string, subject?: string, subjectRoom?: string, assignmentId?: string) {
    if (starting) return
    setStarting(assignmentId ?? templateId)
    try {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const { run } = await api.audits.createRun({ template_id: templateId, audit_month: month, ...(subject ? { subject } : {}), ...(subjectRoom ? { subject_room: subjectRoom } : {}), ...(assignmentId ? { assignment_id: assignmentId } : {}) })
      onOpen(run.id)
    } catch { /* ignore */ } finally { setStarting(null) }
  }

  // Look up a run's subject label (Resident / Staff / Room) from its template.
  const scopeOf = (r: any) => templates.find(t => t.id === r.template_id)?.subject_scope ?? 'none'
  const runSuffix = (r: any) => r.room_number ? ` · ${SUBJECT_LABEL[scopeOf(r)] ? SUBJECT_LABEL[scopeOf(r)] + ' ' : ''}${r.room_number}${r.subject_room ? ` (Room ${r.subject_room})` : ''}` : ''

  if (loading) return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>

  const inProgress = runs.filter(r => r.status === 'in_progress')
  const completed  = runs.filter(r => r.status === 'completed').slice(0, 6)
  // The current period's run for a template — today for daily audits, this month otherwise.
  const now = new Date()
  const sameMonth = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  const sameDay   = (d: Date) => sameMonth(d) && d.getDate() === now.getDate()
  const currentRunFor = (t: any) => runs.find(r => r.template_id === t.id && ((t.frequency ?? 'monthly') === 'daily' ? sameDay(new Date(r.audit_month)) : sameMonth(new Date(r.audit_month))))
  const byFreq = FREQ_ORDER.map(f => ({ freq: f, items: templates.filter(t => (t.frequency ?? 'monthly') === f) })).filter(g => g.items.length)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <datalist id="audit-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
      <datalist id="audit-staff">{staff.map(r => <option key={r} value={r} />)}</datalist>
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-neutral-dark"><ClipboardCheck size={20} className="text-teal" /> Audits</h2>
        <p className="mb-5 text-sm text-neutral-mid">Start, save and complete audits here — they appear in your admin Audit section automatically.</p>

        {/* CQC Readiness Score — admin-role only; the endpoint is admin-gated so it hides for others. */}
        <CqcReadinessCard token={token} userId={userId} />

        {/* Snapshot */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.in_progress}</p>
              <p className="mt-0.5 text-xs text-neutral-mid">Open</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className={`text-2xl font-bold ${stats.due > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{stats.due}</p>
              <p className="mt-0.5 text-xs text-neutral-mid">To start</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed_this_month}</p>
              <p className="mt-0.5 text-xs text-neutral-mid">Done this month</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-teal-600">{stats.completed}</p>
              <p className="mt-0.5 text-xs text-neutral-mid">Completed total</p>
            </div>
          </div>
        )}

        {/* Scheduled audits assigned to this person, soonest first */}
        {assigned.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">Assigned to you</p>
            <div className="space-y-2">
              {assigned.map(a => (
                <div key={a.id} className={`flex items-center gap-3 rounded-xl border p-4 ${a.overdue ? 'border-rose-200 bg-rose-50/50' : 'border-teal/20 bg-teal-light/20'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-dark">{a.template_name}{a.subject ? ` · ${a.subject}` : ''}</p>
                    <p className={`text-xs ${a.overdue ? 'font-semibold text-rose-700' : 'text-neutral-mid'}`}>
                      {a.overdue ? `Overdue by ${a.days_overdue} day${a.days_overdue === 1 ? '' : 's'}` : `Due ${new Date(a.due_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}`}
                      {a.repeat !== 'none' ? ` · repeats ${a.repeat}` : ''}
                    </p>
                  </div>
                  {a.run_id && a.run_status === 'in_progress'
                    ? <button onClick={() => onOpen(a.run_id)} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal">Resume</button>
                    : <button onClick={() => start(a.template_id, a.subject ?? undefined, a.subject_room ?? undefined, a.id)} disabled={starting === a.id} className="flex shrink-0 items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                        {starting === a.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Start
                      </button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">In progress — finish these</p>
            <div className="space-y-2">
              {inProgress.map(r => (
                <button key={r.id} onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left transition hover:border-amber-300">
                  <Play size={16} className="shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-dark">{r.template?.name ?? 'Audit'}{runSuffix(r)}</p>
                    <p className="text-xs text-neutral-mid">{periodLabel(r.audit_month)} · Resume</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-neutral-mid" />
                </button>
              ))}
            </div>
          </div>
        )}

        {byFreq.map(group => (
          <div key={group.freq} className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">{FREQ_LABEL[group.freq] ?? group.freq}</p>
            <div className="space-y-2">
              {group.items.map(t => {
                // Scoped audits (room / resident / staff): pick the subject, then start a run for it.
                const scope = t.subject_scope ?? (t.room_based ? 'room' : 'none')
                if (scope !== 'none') {
                  const subject = (roomInput[t.id] ?? '').trim()
                  const placeholder = scope === 'resident' ? 'Resident name / initials' : scope === 'staff' ? 'Staff member' : 'Room / bed no.'
                  const listId = scope === 'staff' ? 'audit-staff' : scope === 'room' ? 'audit-rooms' : `audit-subj-${t.id}`
                  const btnLabel = scope === 'resident' ? 'Start for resident' : scope === 'staff' ? 'Start for staff' : 'Start room'
                  return (
                    <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      {scope === 'resident' && <datalist id={listId}>{(recentSubjects[t.id] ?? []).map(s => <option key={s} value={s} />)}</datalist>}
                      <p className="text-sm font-medium text-neutral-dark">{t.name}</p>
                      {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-mid">{t.description}</p>}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <input
                          list={listId}
                          value={roomInput[t.id] ?? ''}
                          onChange={e => setRoomInput(p => ({ ...p, [t.id]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-48 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none"
                        />
                        {scope === 'resident' && (
                          <input
                            list="audit-rooms"
                            value={subjectRoomInput[t.id] ?? ''}
                            onChange={e => setSubjectRoomInput(p => ({ ...p, [t.id]: e.target.value }))}
                            placeholder="Room (optional)"
                            className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none"
                          />
                        )}
                        <button onClick={() => { if (subject) start(t.id, subject, scope === 'resident' ? (subjectRoomInput[t.id] ?? '').trim() || undefined : undefined) }} disabled={!subject || starting === t.id} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                          {starting === t.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {btnLabel}
                        </button>
                      </div>
                    </div>
                  )
                }
                const existing = currentRunFor(t)
                const done = existing?.status === 'completed'
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    {done ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : <Circle size={16} className="shrink-0 text-gray-300" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-dark">{t.name}</p>
                      {t.description && <p className="truncate text-xs text-neutral-mid">{t.description}</p>}
                    </div>
                    {existing
                      ? <button onClick={() => onOpen(existing.id)} className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal">{done ? 'View' : 'Resume'}</button>
                      : <button onClick={() => start(t.id)} disabled={starting === t.id} className="flex shrink-0 items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                          {starting === t.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Start
                        </button>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {completed.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Recently completed</p>
            <div className="space-y-1.5">
              {completed.map(r => (
                <button key={r.id} onClick={() => onOpen(r.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-light">
                  <CheckCircle2 size={13} className="shrink-0 text-green-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-dark">{r.template?.name ?? 'Audit'}{runSuffix(r)}</span>
                  <span className="shrink-0 text-xs text-neutral-mid">{new Date(r.completed_at ?? r.audit_month).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {templates.length === 0 && <p className="py-10 text-center text-sm text-neutral-mid">No audit templates yet. Create them in the admin Audits section.</p>}
      </div>
    </div>
  )
}

// ─── Runner: answer questions, auto-save, complete ─────────────────────────────

function AuditRunner({ token, runId, onExit }: { token: string; runId: string; onExit: () => void }) {
  const api = createApiClient(token)
  const [run,       setRun]       = useState<any>(null)
  const [answers,   setAnswers]   = useState<Map<string, Answer>>(new Map())
  const [summary,   setSummary]   = useState({ strengths: '', improvements: '', actions_deadline: '' })
  const [loading,   setLoading]   = useState(true)
  const [section,   setSection]   = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [completing, setCompleting] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [evidence,  setEvidence]  = useState<Map<string, any[]>>(new Map())
  const [uploadingQ, setUploadingQ] = useState<string | null>(null)
  const [qsNames,   setQsNames]   = useState<Record<string, { name: string }>>({})
  const [completeError, setCompleteError] = useState('')
  const isMobile = useIsMobileOrTablet()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    api.audits.getRun(runId).then(({ run: r, approval_required, quality_statements }) => {
      setRun(r)
      setApprovalRequired(!!approval_required)
      setQsNames(quality_statements ?? {})
      const map = new Map<string, Answer>()
      for (const a of (r.answers ?? [])) map.set(a.question_id, answerFromRow(a))
      setAnswers(map)
      const evMap = new Map<string, any[]>()
      for (const e of (r.evidence ?? [])) { const arr = evMap.get(e.question_id) ?? []; arr.push(e); evMap.set(e.question_id, arr) }
      setEvidence(evMap)
      setSummary({ strengths: r.strengths ?? '', improvements: r.improvements ?? '', actions_deadline: r.actions_deadline ?? '' })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addPhoto(qId: string, f: File | null) {
    if (!f) return
    setUploadingQ(qId)
    try {
      const img = await compressImage(f)
      const { evidence: ev } = await api.audits.uploadEvidence(runId, qId, img)
      setEvidence(prev => { const next = new Map(prev); next.set(qId, [...(next.get(qId) ?? []), ev]); return next })
    } catch { /* leave the audit untouched on failure */ } finally { setUploadingQ(null) }
  }
  async function removePhoto(qId: string, id: string) {
    setEvidence(prev => { const next = new Map(prev); next.set(qId, (next.get(qId) ?? []).filter(e => e.id !== id)); return next })
    await api.audits.deleteEvidence(id).catch(() => {})
  }

  const scheduleSave = useCallback((qId: string, value: Answer) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await api.audits.saveAnswers(runId, [{ question_id: qId, ...value }]).catch(() => {})
      setSaving(false)
    }, 600)
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(qId: string, patch: Partial<Answer>) {
    setAnswers(prev => {
      const existing = prev.get(qId) ?? EMPTY_ANSWER
      const updated = { ...existing, ...patch }
      const next = new Map(prev); next.set(qId, updated)
      scheduleSave(qId, updated)
      return next
    })
  }

  async function complete() {
    setCompleting(true); setCompleteError('')
    try {
      // Flush every answer first: the per-question save is debounced.
      clearTimeout(saveTimer.current)
      const all = Array.from(answers.entries()).map(([question_id, v]) => ({ question_id, ...v }))
      if (all.length) await api.audits.saveAnswers(runId, all).catch(() => {})
      await api.audits.updateRun(runId, summary).catch(() => {})
      await api.audits.complete(runId)
      onExit()
    } catch (e: any) {
      setCompleteError(e?.message ?? 'The audit could not be completed. Please try again.')
    } finally { setCompleting(false) }
  }

  if (loading) return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
  if (!run) return <div className="flex-1 p-6"><button onClick={onExit} className="text-sm text-teal">← Back to audits</button><p className="mt-4 text-sm text-status-error">Audit not found.</p></div>

  const isCompleted = run.status === 'completed'
  // Questions hidden by a condition are not asked; findings and free text are optional.
  const visibleIds = visibleQuestionIds(run.template?.sections ?? [], answers)
  const sections: any[] = (run.template?.sections ?? []).map((s: any) => ({ ...s, questions: s.questions.filter((q: any) => visibleIds.has(q.id)) })).filter((s: any) => s.questions.length)
  const allQ = sections.flatMap((s: any) => s.questions)
  const ynQ = allQ.filter((q: any) => !isNarrative(q.question_type))
  const answeredCount = ynQ.filter((q: any) => isAnswered(q, answers.get(q.id))).length
  const progress = ynQ.length > 0 ? Math.round((answeredCount / ynQ.length) * 100) : 100
  const cur = sections[section]
  const lastSection = section >= sections.length - 1

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5">
      <div className="mx-auto max-w-3xl">
        <button onClick={onExit} className="mb-3 flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Audits</button>

        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-dark">{run.template?.name}{run.room_number ? ` · ${SUBJECT_LABEL[run.template?.subject_scope ?? 'none'] ? SUBJECT_LABEL[run.template?.subject_scope ?? 'none'] + ' ' : ''}${run.room_number}${run.subject_room ? ` (Room ${run.subject_room})` : ''}` : ''}</h2>
            <p className="text-xs text-neutral-mid">{periodLabel(run.audit_month)}{isCompleted ? ' · Completed' : ''}</p>
          </div>
          {saving && <span className="shrink-0 text-xs text-neutral-mid">Saving…</span>}
        </div>

        {/* Progress */}
        <div className="my-3">
          <div className="mb-1 flex justify-between text-xs text-neutral-mid"><span>{answeredCount}/{ynQ.length} answered</span><span>{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${progress}%` }} /></div>
        </div>

        {/* Section pills */}
        {sections.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {sections.map((s: any, i: number) => {
              const done = s.questions.every((q: any) => isAnswered(q, answers.get(q.id)))
              return (
                <button key={s.id} onClick={() => setSection(i)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${section === i ? 'bg-teal text-white' : 'border border-gray-200 text-neutral-mid hover:border-teal/40'}`}>
                  {done && <CheckCircle2 size={10} className={section === i ? 'text-white' : 'text-green-500'} />}{s.title}
                </button>
              )
            })}
          </div>
        )}

        {/* Questions in current section */}
        <div className="space-y-3">
          {cur && <p className="text-sm font-semibold text-neutral-dark">{cur.title}</p>}
          {cur?.questions.map((q: any) => {
            const a = answers.get(q.id) ?? EMPTY_ANSWER
            const narrative = isNarrative(q.question_type)
            return (
              <div key={q.id} className={`rounded-xl border bg-white p-4 ${q.show_if ? 'border-teal/30' : 'border-gray-200'}`}>
                <p className="mb-2 text-sm text-neutral-dark">
                  {q.show_if && <CornerDownRight size={13} className="mr-1 inline text-teal" />}
                  {q.question_text}
                </p>
                {q.quality_statement_id && qsNames[q.quality_statement_id] && (
                  <span className="mb-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">CQC: {qsNames[q.quality_statement_id].name}</span>
                )}
                {!narrative && (
                  <div className="mb-2">
                    <QuestionInput q={q} a={a} disabled={isCompleted} onChange={patch => update(q.id, patch)} />
                  </div>
                )}
                <textarea
                  disabled={isCompleted}
                  value={a.outcome_text}
                  onChange={e => update(q.id, { outcome_text: e.target.value })}
                  placeholder={narrative ? 'Findings' : 'Outcome / notes (optional)'}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none disabled:bg-gray-50"
                />
                {q.question_type !== 'free_text' && (
                  <textarea
                    disabled={isCompleted}
                    value={a.actions_text}
                    onChange={e => update(q.id, { actions_text: e.target.value })}
                    placeholder="Actions to be taken (optional)"
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none disabled:bg-gray-50"
                  />
                )}

                {/* Evidence photos — capture/upload on phone or tablet (optional);
                    thumbnails always show if any exist. */}
                {(() => {
                  const evs = evidence.get(q.id) ?? []
                  const showAdd = isMobile && !isCompleted
                  if (!showAdd && evs.length === 0) return null
                  return (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-mid"><Camera size={13} /> Evidence photos{evs.length ? ` (${evs.length})` : ''}</div>
                      <div className="flex flex-wrap gap-2">
                        {evs.map(ev => (
                          <div key={ev.id} className="relative">
                            <AuthedImage
                              id={ev.id}
                              load={() => api.audits.evidenceBlob(ev.id)}
                              alt={ev.file_name}
                              onClick={() => api.audits.evidenceBlob(ev.id).then(b => window.open(URL.createObjectURL(b), '_blank', 'noopener')).catch(() => {})}
                              className="h-16 w-16 cursor-pointer rounded-lg object-cover ring-1 ring-gray-200"
                            />
                            {!isCompleted && (
                              <button onClick={() => removePhoto(q.id, ev.id)} aria-label="Remove photo" className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-neutral-mid shadow ring-1 ring-gray-200 hover:text-red-500"><X size={12} /></button>
                            )}
                          </div>
                        ))}
                        {showAdd && (
                          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 text-neutral-mid hover:border-teal hover:text-teal">
                            {uploadingQ === q.id ? <Loader2 size={16} className="animate-spin" /> : <><Camera size={16} /><span className="text-[9px]">Add</span></>}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingQ === q.id} onChange={e => { addPhoto(q.id, e.target.files?.[0] ?? null); e.currentTarget.value = '' }} />
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>

        {/* Section nav */}
        {sections.length > 1 && (
          <div className="mt-4 flex justify-between">
            <button disabled={section === 0} onClick={() => setSection(s => Math.max(0, s - 1))} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-mid disabled:opacity-40"><ChevronLeft size={14} /> Prev</button>
            {!lastSection && <button onClick={() => setSection(s => Math.min(sections.length - 1, s + 1))} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-dark hover:border-teal/40">Next <ChevronRight size={14} /></button>}
          </div>
        )}

        {/* Summary + complete (last section, not completed) */}
        {!isCompleted && lastSection && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-neutral-dark">Audit summary</p>
            <textarea value={summary.strengths} onChange={e => setSummary(s => ({ ...s, strengths: e.target.value }))} placeholder="Strengths identified" rows={2} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            <textarea value={summary.improvements} onChange={e => setSummary(s => ({ ...s, improvements: e.target.value }))} placeholder="Areas requiring improvement" rows={2} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            <input value={summary.actions_deadline} onChange={e => setSummary(s => ({ ...s, actions_deadline: e.target.value }))} placeholder="Deadline for actions" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            <div className="flex items-center gap-3">
              <button onClick={complete} disabled={completing || progress < 100} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                {completing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {approvalRequired ? 'Send for approval' : 'Complete audit'}
              </button>
              <button onClick={onExit} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-teal/40"><Pause size={13} /> Save &amp; exit</button>
            </div>
            {progress < 100 && <p className="mt-2 text-xs text-amber-600">{ynQ.length - answeredCount} question{ynQ.length - answeredCount === 1 ? '' : 's'} still to answer before you can finish.</p>}
            {completeError && <p className="mt-2 text-xs text-red-600">{completeError}</p>}
            <p className="mt-2 text-xs text-neutral-mid">
              {approvalRequired
                ? 'Sends the audit to your care manager to review and approve. The AI recommendations are generated once they approve.'
                : 'Completing generates AI recommendations and locks the audit. It will appear in your admin Audit section.'}
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50/50 p-4 text-sm text-neutral-dark">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-green-700"><CheckCircle2 size={15} /> Completed</p>
            {run.ai_recommendations && <div className="mt-2"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">AI recommendations</p><AuditRecs text={run.ai_recommendations} /></div>}
            <p className="mt-2 text-xs text-neutral-mid">Open the admin Audit section to print or export this audit.</p>
          </div>
        )}
      </div>
    </div>
  )
}
