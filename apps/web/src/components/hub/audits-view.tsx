'use client'

// Hub Audits — admin-role staff can start, save and complete audits from the
// Chat Hub. Uses the same /audits API + tables as the admin site, so completed
// runs appear in the site's Audit section automatically.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache, hubKey } from '@/lib/page-cache'
import {
  ClipboardCheck, ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2,
  Sparkles, Play, Pause, Plus,
} from 'lucide-react'

type Answer = { answer_yn: boolean | null; answer_na: boolean; outcome_text: string; actions_text: string }

const FREQ_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']
const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }

// Monthly/weekly runs are dated the 1st; daily runs are a specific day.
function periodLabel(audit_month: string | Date) {
  const d = new Date(audit_month)
  return d.getDate() === 1
    ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isYN(t: string) { return t === 'yes_no' || t === 'yes_no_na' }
function isAnswered(q: any, a?: Answer) {
  if (q.question_type === 'findings' || q.question_type === 'free_text') return true
  return a?.answer_na === true || (a?.answer_yn !== null && a?.answer_yn !== undefined)
}

export function AuditsView({ token, userId }: { token: string; userId: string }) {
  const api = createApiClient(token)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  if (activeRunId) {
    return <AuditRunner token={token} runId={activeRunId} onExit={() => setActiveRunId(null)} />
  }
  return <AuditList api={api} userId={userId} onOpen={setActiveRunId} />
}

// ─── List: templates to start, in-progress to resume, recent completed ─────────

function AuditList({ api, userId, onOpen }: { api: ReturnType<typeof createApiClient>; userId: string; onOpen: (runId: string) => void }) {
  const ck = hubKey('audits', userId)
  const cached = persistentCache.get<{ templates: any[]; runs: any[]; rooms: string[]; stats: any }>(ck)
  const [templates, setTemplates] = useState<any[]>(cached?.templates ?? [])
  const [runs,      setRuns]      = useState<any[]>(cached?.runs ?? [])
  const [rooms,     setRooms]     = useState<string[]>(cached?.rooms ?? [])
  const [stats,     setStats]     = useState<any>(cached?.stats ?? null)
  const [roomInput, setRoomInput] = useState<Record<string, string>>({})
  const [loading,   setLoading]   = useState(!cached)
  const [starting,  setStarting]  = useState<string | null>(null)

  function load() {
    Promise.all([api.audits.templates(), api.audits.runs(), api.audits.stats()])
      .then(([t, r, s]) => { setTemplates(t.templates ?? []); setRooms(t.rooms ?? []); setRuns(r.runs ?? []); setStats(s); persistentCache.set(ck, { templates: t.templates ?? [], runs: r.runs ?? [], rooms: t.rooms ?? [], stats: s }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function start(templateId: string, room?: string) {
    if (starting) return
    setStarting(templateId)
    try {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const { run } = await api.audits.createRun({ template_id: templateId, audit_month: month, ...(room ? { room_number: room } : {}) })
      onOpen(run.id)
    } catch { /* ignore */ } finally { setStarting(null) }
  }

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
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-neutral-dark"><ClipboardCheck size={20} className="text-teal" /> Audits</h2>
        <p className="mb-5 text-sm text-neutral-mid">Start, save and complete audits here — they appear in your admin Audit section automatically.</p>

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

        {inProgress.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">In progress — finish these</p>
            <div className="space-y-2">
              {inProgress.map(r => (
                <button key={r.id} onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left transition hover:border-amber-300">
                  <Play size={16} className="shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-dark">{r.template?.name ?? 'Audit'}{r.room_number ? ` · Room ${r.room_number}` : ''}</p>
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
                // Room-based audits: pick a room, then start a per-room run.
                if (t.room_based) {
                  const room = (roomInput[t.id] ?? '').trim()
                  return (
                    <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-sm font-medium text-neutral-dark">{t.name}</p>
                      {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-mid">{t.description}</p>}
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          list="audit-rooms"
                          value={roomInput[t.id] ?? ''}
                          onChange={e => setRoomInput(p => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="Room / bed no."
                          className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none"
                        />
                        <button onClick={() => { if (room) start(t.id, room) }} disabled={!room || starting === t.id} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                          {starting === t.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Start room
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
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-dark">{r.template?.name ?? 'Audit'}{r.room_number ? ` · Room ${r.room_number}` : ''}</span>
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    api.audits.getRun(runId).then(({ run: r }) => {
      setRun(r)
      const map = new Map<string, Answer>()
      for (const a of (r.answers ?? [])) map.set(a.question_id, { answer_yn: a.answer_yn ?? null, answer_na: a.answer_na ?? false, outcome_text: a.outcome_text ?? '', actions_text: a.actions_text ?? '' })
      setAnswers(map)
      setSummary({ strengths: r.strengths ?? '', improvements: r.improvements ?? '', actions_deadline: r.actions_deadline ?? '' })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback((qId: string, value: Answer) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await api.audits.saveAnswers(runId, [{ question_id: qId, answer_yn: value.answer_yn, answer_na: value.answer_na, outcome_text: value.outcome_text, actions_text: value.actions_text } as any]).catch(() => {})
      setSaving(false)
    }, 600)
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(qId: string, field: keyof Answer, value: any) {
    setAnswers(prev => {
      const existing = prev.get(qId) ?? { answer_yn: null, answer_na: false, outcome_text: '', actions_text: '' }
      const patch = field === 'answer_yn' ? { answer_yn: value, answer_na: false }
        : field === 'answer_na' ? { answer_na: value, answer_yn: null }
        : { [field]: value }
      const updated = { ...existing, ...patch }
      const next = new Map(prev); next.set(qId, updated)
      scheduleSave(qId, updated)
      return next
    })
  }

  async function complete() {
    setCompleting(true)
    try {
      await api.audits.updateRun(runId, summary).catch(() => {})
      await api.audits.complete(runId)
      onExit()
    } catch { /* ignore */ } finally { setCompleting(false) }
  }

  if (loading) return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
  if (!run) return <div className="flex-1 p-6"><button onClick={onExit} className="text-sm text-teal">← Back to audits</button><p className="mt-4 text-sm text-status-error">Audit not found.</p></div>

  const isCompleted = run.status === 'completed'
  const sections: any[] = run.template?.sections ?? []
  const allQ = sections.flatMap((s: any) => s.questions)
  const ynQ = allQ.filter((q: any) => isYN(q.question_type))
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
            <h2 className="truncate text-lg font-bold text-neutral-dark">{run.template?.name}{run.room_number ? ` · Room ${run.room_number}` : ''}</h2>
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
            const a = answers.get(q.id) ?? { answer_yn: null, answer_na: false, outcome_text: '', actions_text: '' }
            return (
              <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-2 text-sm text-neutral-dark">{q.question}</p>
                {isYN(q.question_type) && (
                  <div className="mb-2 flex gap-2">
                    <button disabled={isCompleted} onClick={() => update(q.id, 'answer_yn', true)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${a.answer_yn === true && !a.answer_na ? 'bg-green-500 text-white' : 'border border-gray-200 text-neutral-mid hover:border-green-400'}`}>Yes</button>
                    <button disabled={isCompleted} onClick={() => update(q.id, 'answer_yn', false)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${a.answer_yn === false && !a.answer_na ? 'bg-red-500 text-white' : 'border border-gray-200 text-neutral-mid hover:border-red-400'}`}>No</button>
                    {q.question_type === 'yes_no_na' && (
                      <button disabled={isCompleted} onClick={() => update(q.id, 'answer_na', true)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${a.answer_na ? 'bg-gray-400 text-white' : 'border border-gray-200 text-neutral-mid hover:border-gray-400'}`}>N/A</button>
                    )}
                  </div>
                )}
                <textarea
                  disabled={isCompleted}
                  value={a.outcome_text}
                  onChange={e => update(q.id, 'outcome_text', e.target.value)}
                  placeholder={isYN(q.question_type) ? 'Outcome / notes (optional)' : 'Findings'}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none disabled:bg-gray-50"
                />
                {q.question_type !== 'free_text' && (
                  <textarea
                    disabled={isCompleted}
                    value={a.actions_text}
                    onChange={e => update(q.id, 'actions_text', e.target.value)}
                    placeholder="Actions to be taken (optional)"
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none disabled:bg-gray-50"
                  />
                )}
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
              <button onClick={complete} disabled={completing} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
                {completing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Complete audit
              </button>
              <button onClick={onExit} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-teal/40"><Pause size={13} /> Save &amp; exit</button>
            </div>
            <p className="mt-2 text-xs text-neutral-mid">Completing generates AI recommendations and locks the audit. It will appear in your admin Audit section.</p>
          </div>
        )}

        {isCompleted && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50/50 p-4 text-sm text-neutral-dark">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-green-700"><CheckCircle2 size={15} /> Completed</p>
            {run.ai_recommendations && <div className="mt-2"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">AI recommendations</p><p className="whitespace-pre-wrap text-sm text-neutral-dark">{run.ai_recommendations}</p></div>}
            <p className="mt-2 text-xs text-neutral-mid">Open the admin Audit section to print or export this audit.</p>
          </div>
        )}
      </div>
    </div>
  )
}
