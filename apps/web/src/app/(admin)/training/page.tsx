'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import {
  AlertCircle, CheckCircle2, ChevronDown, Clock, ExternalLink, History,
  Info, Lock, Loader2, Plus, Save, ShieldCheck, Sparkles, Trash2, Unlock, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = {
  id: string; slug: string; name: string; description: string
  category: string; sort_order: number
  questions:           Array<{ id: string; text: string }>
  questions_locked:    boolean
  questions_locked_at: string | null
  questions_version:   number
}
type Staff  = { id: string; name: string; email: string; job_role: string | null; shift_type?: string }
type Enrollment = {
  id: string; user_id: string; module_id: string; status: string
  completed_at: string | null; expires_at: string | null
  certificate_url: string | null; due_date: string | null
  daysUntilExpiry: number | null
  module: { id: string; slug: string; name: string; category: string; sort_order: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function HelpAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40"
      >
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">{title}</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          {children}
        </div>
      )}
    </div>
  )
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusCell({ enrollment }: { enrollment: Enrollment | undefined }) {
  if (!enrollment) return <span className="text-gray-300 text-sm">—</span>

  const { status, daysUntilExpiry } = enrollment
  if (status === 'complete') {
    if (daysUntilExpiry !== null && daysUntilExpiry <= 90) {
      return <span title={`Expires in ${daysUntilExpiry} days`} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertCircle size={14} /></span>
    }
    return <span title="Complete" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={14} /></span>
  }
  if (status === 'expired') {
    return <span title="Expired" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertCircle size={14} /></span>
  }
  if (status === 'in_progress') {
    return <span title="In progress" className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal"><Clock size={12} /></span>
  }
  // not_started
  return <span title="Not started" className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-300"><Clock size={12} /></span>
}

// ─── Assign modal ─────────────────────────────────────────────────────────────

function AssignModal({ api, staff, modules, onClose, onAssigned }: {
  api:        ReturnType<typeof createApiClient>
  staff:      Staff[]
  modules:    Module[]
  onClose:    () => void
  onAssigned: () => void
}) {
  const [selectedStaff,   setSelectedStaff]   = useState<Set<string>>(new Set(staff.map(s => s.id)))
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(modules.filter(m => m.category === 'statutory').map(m => m.id))
  )
  const [dueDate, setDueDate] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const statutory  = modules.filter(m => m.category === 'statutory')
  const specialist = modules.filter(m => m.category === 'specialist')

  function toggleStaff(id: string) {
    setSelectedStaff(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleModule(id: string) {
    setSelectedModules(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function assign() {
    if (selectedStaff.size === 0 || selectedModules.size === 0) {
      setError('Select at least one staff member and one module.'); return
    }
    setSaving(true); setError('')
    try {
      await api.training.enroll({
        user_ids:   [...selectedStaff],
        module_ids: [...selectedModules],
        due_date:   dueDate || undefined,
      })
      onAssigned()
    } catch (e: any) {
      setError(e.message ?? 'Failed to assign training')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Assign Training Modules</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>
        <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Staff selection */}
          <div className="px-5 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              Staff ({selectedStaff.size} selected)
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                  <input type="checkbox" checked={selectedStaff.has(s.id)} onChange={() => toggleStaff(s.id)}
                    className="h-4 w-4 accent-teal" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-dark truncate">{s.name}</p>
                    <p className="text-xs text-neutral-mid truncate">{s.job_role ?? s.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Module selection */}
          <div className="px-5 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              Modules ({selectedModules.size} selected)
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              <p className="text-xs font-semibold text-teal">Statutory (annual)</p>
              {statutory.map(m => (
                <label key={m.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                  <input type="checkbox" checked={selectedModules.has(m.id)} onChange={() => toggleModule(m.id)}
                    className="mt-0.5 h-4 w-4 accent-teal" />
                  <p className="text-sm text-neutral-dark leading-snug">{m.name}</p>
                </label>
              ))}
              {specialist.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-semibold text-indigo-500">Specialist</p>
                  {specialist.map(m => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                      <input type="checkbox" checked={selectedModules.has(m.id)} onChange={() => toggleModule(m.id)}
                        className="mt-0.5 h-4 w-4 accent-teal" />
                      <p className="text-sm text-neutral-dark leading-snug">{m.name}</p>
                    </label>
                  ))}
                </>
              )}
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-neutral-mid">Due date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            </div>
          </div>
        </div>

        {error && <p className="px-6 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          <button onClick={assign} disabled={saving}
            className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="mr-1.5 inline animate-spin" />Assigning…</> : `Assign ${selectedModules.size} module${selectedModules.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Enrollment detail modal ──────────────────────────────────────────────────

function EnrollmentModal({ api, enrollmentId, onClose, onUpdated }: {
  api:          ReturnType<typeof createApiClient>
  enrollmentId: string
  onClose:      () => void
  onUpdated:    () => void
}) {
  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [completing, setCompleting] = useState(false)
  const [removing,   setRemoving]   = useState(false)

  useEffect(() => {
    api.training.getEnrollment(enrollmentId)
      .then(d => setData(d.enrollment))
      .finally(() => setLoading(false))
  }, [enrollmentId])

  async function markComplete() {
    setCompleting(true)
    try {
      await api.training.complete(enrollmentId)
      onUpdated()
    } finally { setCompleting(false) }
  }

  async function remove() {
    if (!confirm('Remove this training assignment?')) return
    setRemoving(true)
    try {
      await api.training.removeEnrollment(enrollmentId)
      onUpdated()
    } finally { setRemoving(false) }
  }

  const statusColour: Record<string, string> = {
    complete:    'bg-green-100 text-green-700',
    expired:     'bg-red-100 text-red-600',
    in_progress: 'bg-teal/10 text-teal',
    not_started: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Training Record</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>

        {loading && <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>}
        {!loading && data && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-neutral-dark">{data.module.name}</p>
                <p className="text-sm text-neutral-mid">{data.user.name} · {data.user.job_role ?? data.user.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColour[data.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {data.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-medium text-neutral-mid">Completed</p>
                <p className="mt-0.5 font-semibold text-neutral-dark">{fmt(data.completed_at)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-medium text-neutral-mid">Expires</p>
                <p className={`mt-0.5 font-semibold ${data.expires_at && new Date(data.expires_at) < new Date() ? 'text-red-500' : 'text-neutral-dark'}`}>
                  {fmt(data.expires_at)}
                </p>
              </div>
            </div>

            {data.certificate_url && (
              <a href={data.certificate_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-sm font-medium text-teal hover:bg-teal-light/40">
                <ExternalLink size={13} /> View certificate
              </a>
            )}

            {data.answers.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Answers</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {data.module.questions.map((q: any, i: number) => {
                    const answer  = data.answers.find((a: any) => a.question_id === q.id)
                    const options = q.options as string[] | undefined
                    const LABELS  = ['A', 'B', 'C', 'D']
                    return (
                      <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <p className="text-xs font-medium text-neutral-mid">Q{i + 1}: {q.text}</p>
                        {options && (
                          <div className="mt-1.5 space-y-0.5">
                            {options.map((opt: string, oi: number) => (
                              <p key={oi} className={`text-xs ${q.correct === oi ? 'font-semibold text-teal' : 'text-neutral-mid'}`}>
                                {LABELS[oi]}. {opt}{q.correct === oi ? ' (correct)' : ''}
                              </p>
                            ))}
                          </div>
                        )}
                        {answer ? (
                          <div className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                            answer.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {answer.is_correct ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            Staff answered: {answer.answer_text} — {answer.is_correct ? 'Correct' : 'Incorrect'}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs italic text-neutral-mid/60">Not answered yet</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
              {(data.status === 'not_started' || data.status === 'in_progress') && (
                <button onClick={markComplete} disabled={completing}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                  {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Mark complete
                </button>
              )}
              <button onClick={remove} disabled={removing}
                className="ml-auto text-xs text-red-500 hover:underline disabled:opacity-50">
                {removing ? 'Removing…' : 'Remove assignment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modules tab ──────────────────────────────────────────────────────────────

type Question = {
  id:      string
  text:    string
  options: [string, string, string, string]  // A, B, C, D
  correct: 0 | 1 | 2 | 3                    // index of correct option
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

function emptyQuestion(): Question {
  return { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correct: 0 }
}

function isComplete(q: Question) {
  return q.text.trim() && q.options.every(o => o.trim())
}

function McqQuestionEditor({ q, idx, moduleId, onChange, onRemove }: {
  q:        Question
  idx:      number
  moduleId: string
  onChange: (updated: Question) => void
  onRemove: () => void
}) {
  const incomplete = !isComplete(q)
  return (
    <div className={`rounded-xl border p-4 ${incomplete ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-gray-50'}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">Q{idx + 1}</span>
          {incomplete && <span className="text-[10px] font-medium text-amber-600">Incomplete</span>}
        </div>
        <button onClick={onRemove} className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-500" title="Remove question">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Question text */}
      <input
        type="text"
        value={q.text}
        onChange={e => onChange({ ...q, text: e.target.value })}
        placeholder="Enter the question…"
        className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
      />

      {/* Options A–D */}
      <div className="space-y-2">
        {OPTION_LABELS.map((label, optIdx) => {
          const isCorrect = q.correct === optIdx
          return (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => onChange({ ...q, correct: optIdx as 0|1|2|3 })}
                title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                  isCorrect
                    ? 'border-teal bg-teal text-white'
                    : 'border-gray-300 bg-white text-gray-400 hover:border-teal hover:text-teal'
                }`}
              >
                {label}
              </button>
              <input
                type="text"
                value={q.options[optIdx]}
                onChange={e => {
                  const opts = [...q.options] as [string,string,string,string]
                  opts[optIdx] = e.target.value
                  onChange({ ...q, options: opts })
                }}
                placeholder={`Option ${label}…`}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                  isCorrect
                    ? 'border-teal/40 bg-teal/5 text-teal focus:border-teal focus:ring-teal'
                    : 'border-gray-200 bg-white text-neutral-dark focus:border-teal focus:ring-teal'
                }`}
              />
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-neutral-mid">Click a letter to mark that option as the correct answer.</p>
    </div>
  )
}

function ModulesTab({ api, modules }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
}) {
  const [open,           setOpen]           = useState<string | null>(null)
  const [editing,        setEditing]        = useState<Record<string, Question[]>>({})
  const [dirty,          setDirty]          = useState<Set<string>>(new Set())
  const [savedQuestions, setSavedQuestions] = useState<Record<string, Question[]>>({})
  const [saving,         setSaving]         = useState<string | null>(null)
  const [saved,          setSaved]          = useState<string | null>(null)
  const [genLoading,    setGenLoading]    = useState<Record<string, 'questions' | 'answers' | null>>({})
  const [genError,      setGenError]      = useState<Record<string, string>>({})
  const [lockLoading,   setLockLoading]   = useState<string | null>(null)
  const [localLock,     setLocalLock]     = useState<Record<string, { locked: boolean; locked_at: string | null }>>({})
  const [localVersion,  setLocalVersion]  = useState<Record<string, number>>({})

  function getQuestions(m: Module): Question[] {
    if (editing[m.id]) return editing[m.id]
    if (savedQuestions[m.id]) return savedQuestions[m.id]
    // Normalise legacy questions (text-only, no options) to MCQ shape
    return (m.questions as any[]).map(q => ({
      id:      q.id,
      text:    q.text ?? '',
      options: q.options ?? ['', '', '', ''],
      correct: q.correct ?? 0,
    }))
  }

  function startEdit(m: Module) {
    if (!editing[m.id]) setEditing(prev => ({ ...prev, [m.id]: getQuestions(m) }))
    setOpen(m.id)
  }

  function updateQuestion(moduleId: string, idx: number, updated: Question) {
    setEditing(prev => {
      const qs = [...(prev[moduleId] ?? [])]
      qs[idx] = updated
      return { ...prev, [moduleId]: qs }
    })
    setDirty(p => new Set(p).add(moduleId))
  }

  function addQuestion(moduleId: string) {
    setEditing(prev => ({
      ...prev,
      [moduleId]: [...(prev[moduleId] ?? []), emptyQuestion()],
    }))
    setDirty(p => new Set(p).add(moduleId))
  }

  function removeQuestion(moduleId: string, idx: number) {
    setEditing(prev => {
      const qs = [...(prev[moduleId] ?? [])]
      qs.splice(idx, 1)
      return { ...prev, [moduleId]: qs }
    })
    setDirty(p => new Set(p).add(moduleId))
  }

  async function save(m: Module) {
    const qs = editing[m.id]
    if (!qs) return
    setSaving(m.id)
    try {
      await api.training.updateModuleQuestions(m.id, qs)
      setSavedQuestions(p => ({ ...p, [m.id]: qs }))
      setEditing(p => { const n = { ...p }; delete n[m.id]; return n })
      setDirty(p => { const n = new Set(p); n.delete(m.id); return n })
      setLocalVersion(p => ({ ...p, [m.id]: (p[m.id] ?? m.questions_version ?? 0) + 1 }))
      setSaved(m.id)
      setTimeout(() => setSaved(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  async function generateQuestions(m: Module) {
    setGenLoading(p => ({ ...p, [m.id]: 'questions' }))
    setGenError(p => ({ ...p, [m.id]: '' }))
    try {
      const { questions } = await api.training.generateQuestions(m.id, 8)
      const typed: Question[] = questions.map(q => ({
        id:      q.id,
        text:    q.text,
        options: (q.options ?? ['', '', '', '']).slice(0, 4) as [string, string, string, string],
        correct: (q.correct ?? 0) as 0 | 1 | 2 | 3,
      }))
      setEditing(p => ({ ...p, [m.id]: typed }))
      setDirty(p => new Set(p).add(m.id))
      setOpen(m.id)
    } catch (e: any) {
      setGenError(p => ({ ...p, [m.id]: e.message ?? 'Generation failed' }))
    } finally {
      setGenLoading(p => ({ ...p, [m.id]: null }))
    }
  }

  async function generateAnswers(m: Module) {
    const qs = editing[m.id] ?? getQuestions(m)
    const textOnly = qs.filter(q => q.text.trim())
    if (textOnly.length === 0) {
      setGenError(p => ({ ...p, [m.id]: 'Add question texts first, then generate answer options.' }))
      return
    }
    setGenLoading(p => ({ ...p, [m.id]: 'answers' }))
    setGenError(p => ({ ...p, [m.id]: '' }))
    try {
      const { questions } = await api.training.generateAnswers(m.id, textOnly)
      const typed: Question[] = questions.map(q => ({
        id:      q.id,
        text:    q.text,
        options: (q.options ?? ['', '', '', '']).slice(0, 4) as [string, string, string, string],
        correct: (q.correct ?? 0) as 0 | 1 | 2 | 3,
      }))
      setEditing(p => ({ ...p, [m.id]: typed }))
      setDirty(p => new Set(p).add(m.id))
      setOpen(m.id)
    } catch (e: any) {
      setGenError(p => ({ ...p, [m.id]: e.message ?? 'Generation failed' }))
    } finally {
      setGenLoading(p => ({ ...p, [m.id]: null }))
    }
  }

  async function lockModule(m: Module) {
    setLockLoading(m.id)
    try {
      await api.training.lockModule(m.id)
      setLocalLock(p => ({ ...p, [m.id]: { locked: true, locked_at: new Date().toISOString() } }))
    } finally {
      setLockLoading(null)
    }
  }

  async function unlockModule(m: Module) {
    setLockLoading(m.id)
    try {
      await api.training.unlockModule(m.id)
      setLocalLock(p => ({ ...p, [m.id]: { locked: false, locked_at: null } }))
    } finally {
      setLockLoading(null)
    }
  }

  const statutory  = modules.filter(m => m.category === 'statutory')
  const specialist = modules.filter(m => m.category === 'specialist')

  function renderGroup(title: string, colour: string, list: Module[]) {
    return (
      <div className="mb-6">
        <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${colour}`}>{title}</p>
        <div className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
          {list.map(m => {
            const isOpen     = open === m.id
            const qs         = getQuestions(m)
            const isDirty    = dirty.has(m.id)
            const incomplete = qs.some(q => !isComplete(q))
            const lockState  = localLock[m.id]
            const isLocked   = lockState !== undefined ? lockState.locked : m.questions_locked
            const lockedAt   = lockState !== undefined ? lockState.locked_at : m.questions_locked_at
            const version    = localVersion[m.id] ?? m.questions_version ?? 0

            return (
              <div key={m.id}>
                <button
                  onClick={() => isOpen ? setOpen(null) : startEdit(m)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-neutral-light/40"
                >
                  <div className="flex items-center gap-3">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.category === 'statutory' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'
                    }`}>
                      {m.category === 'statutory' ? 'S' : 'Sp'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-dark">{m.name}</p>
                      <p className="text-xs text-neutral-mid">
                        {qs.length} question{qs.length !== 1 ? 's' : ''}
                        {version > 0 && <span className="ml-1.5 text-neutral-mid/60">v{version}</span>}
                        {incomplete && <span className="ml-1.5 text-amber-500">· needs options</span>}
                        {isDirty && !incomplete && <span className="ml-1.5">· unsaved changes</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLocked && <span title="Questions locked"><Lock size={13} className="text-green-600" /></span>}
                    {(isDirty || incomplete) && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                    <ChevronDown size={15} className={`text-neutral-mid transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                    <p className="mb-3 text-xs text-neutral-mid">{m.description}</p>

                    {/* Lock status banner */}
                    {isLocked && (
                      <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <Lock size={13} />
                          <span className="font-medium">Questions locked</span>
                          {lockedAt && (
                            <span className="text-green-600/70">
                              — {new Date(lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => unlockModule(m)}
                          disabled={lockLoading === m.id}
                          className="flex items-center gap-1.5 rounded-md border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          {lockLoading === m.id ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                          Unlock to edit
                        </button>
                      </div>
                    )}

                    {/* AI generation buttons — disabled when locked */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => generateQuestions(m)}
                        disabled={!!genLoading[m.id] || isLocked}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40"
                      >
                        {genLoading[m.id] === 'questions'
                          ? <><Loader2 size={12} className="animate-spin" /> Generating questions…</>
                          : <><Sparkles size={12} /> Generate questions</>
                        }
                      </button>
                      <button
                        onClick={() => generateAnswers(m)}
                        disabled={!!genLoading[m.id] || isLocked}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40"
                      >
                        {genLoading[m.id] === 'answers'
                          ? <><Loader2 size={12} className="animate-spin" /> Generating answers…</>
                          : <><Sparkles size={12} /> Generate answer options</>
                        }
                      </button>
                      <span className="text-[10px] text-neutral-mid">AI generates questions using your Knowledge seed and care setting context</span>
                    </div>
                    {genError[m.id] && (
                      <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{genError[m.id]}</p>
                    )}

                    <div className={`space-y-3 ${isLocked ? 'pointer-events-none opacity-60' : ''}`}>
                      {qs.map((q, idx) => (
                        <McqQuestionEditor
                          key={q.id}
                          q={q}
                          idx={idx}
                          moduleId={m.id}
                          onChange={updated => updateQuestion(m.id, idx, updated)}
                          onRemove={() => removeQuestion(m.id, idx)}
                        />
                      ))}
                    </div>

                    {!isLocked && (
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={() => addQuestion(m.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
                        >
                          <Plus size={13} /> Add question
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => save(m)}
                            disabled={saving === m.id || !isDirty}
                            className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                          >
                            {saving === m.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Saving…</>
                            ) : saved === m.id ? (
                              <><CheckCircle2 size={12} /> Saved</>
                            ) : (
                              <><Save size={12} /> Save changes</>
                            )}
                          </button>
                          {!isDirty && version > 0 && qs.length > 0 && !incomplete && (
                            <button
                              onClick={() => lockModule(m)}
                              disabled={lockLoading === m.id}
                              className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-4 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              {lockLoading === m.id ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                              Lock questions
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <HelpAccordion title="How Modules &amp; Questions work">
        <p><strong className="text-neutral-dark">What this tab does</strong> — each training module needs a set of multiple-choice questions before staff can be assessed. This tab lets you create, edit, and manage those questions for every module in your library.</p>
        <p><strong className="text-neutral-dark">Question format</strong> — every question has four answer options (A, B, C, D). Click the letter circle next to an option to mark it as the correct answer — it will highlight in teal. A question is considered complete when it has a question text and all four options filled in. Incomplete questions are flagged in amber and cannot be locked.</p>
        <p><strong className="text-neutral-dark">AI generation</strong> — click <strong className="text-neutral-dark">Generate questions</strong> to have the AI create a full set of questions automatically, using CareStreamAI's care sector expertise combined with your <strong className="text-neutral-dark">Knowledge seed</strong> — the information you have added that is specific to your care setting. If you prefer to write your own question texts first, click <strong className="text-neutral-dark">Generate answer options</strong> to have the AI fill in the A/B/C/D choices around your questions.</p>
        <p><strong className="text-neutral-dark">Saving changes</strong> — once you have edited or generated questions, click <strong className="text-neutral-dark">Save changes</strong>. Each save creates a new version snapshot in the Question History tab. The version number (e.g. v1, v2) is shown next to the module name.</p>
        <p><strong className="text-neutral-dark">Locking questions</strong> — after saving a complete set (all questions with text and four options), the <strong className="text-neutral-dark">Lock questions</strong> button appears. Locking records a date-stamped audit trail of the exact questions used for that period. Locked questions cannot be edited until you unlock them. This is important for CQC evidence — it proves which questions were in use at any given time.</p>
        <p><strong className="text-neutral-dark">Unlocking to edit</strong> — if you need to update questions (e.g. a policy changes), click <strong className="text-neutral-dark">Unlock to edit</strong> inside the module panel. After making changes, save and re-lock to create a new version.</p>
      </HelpAccordion>

      {renderGroup('Statutory modules', 'text-teal', statutory)}
      {renderGroup('Specialist modules', 'text-indigo-500', specialist)}

    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryTab({ api, modules }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
}) {
  const [allVersions, setAllVersions] = useState<Array<{ module: Module; versions: any[] }>>([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        modules.map(async m => {
          try {
            const { versions } = await api.training.moduleVersions(m.id)
            return { module: m, versions }
          } catch {
            return { module: m, versions: [] }
          }
        })
      )
      setAllVersions(results.filter(r => r.versions.length > 0))
      setLoading(false)
    }
    load()
  }, [modules])

  // Filter versions by date range
  const fromMs = filterFrom ? new Date(filterFrom).setHours(0,  0,  0, 0) : null
  const toMs   = filterTo   ? new Date(filterTo).setHours(23, 59, 59, 999) : null

  const filtered = allVersions.map(({ module: m, versions }) => ({
    module: m,
    versions: versions.filter((v: any) => {
      const ts = new Date(v.created_at).getTime()
      if (fromMs !== null && ts < fromMs) return false
      if (toMs   !== null && ts > toMs)   return false
      return true
    }),
  })).filter(r => r.versions.length > 0)

  const totalVersions = filtered.reduce((sum, r) => sum + r.versions.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neutral-mid" />
      </div>
    )
  }

  return (
    <div>
      <HelpAccordion title="How Question History works">
        <p><strong className="text-neutral-dark">What this tab does</strong> — every time you save questions on the Modules &amp; Questions tab, a full snapshot of that question set is stored here. This gives you a permanent, time-stamped audit trail of every version of every module's questions.</p>
        <p><strong className="text-neutral-dark">Versions</strong> — each saved set is recorded as a new version (v1, v2, v3, and so on). The most recent version is shown first. Expanding a version reveals the complete question set as it was at that point in time, including the correct answers marked in teal.</p>
        <p><strong className="text-neutral-dark">Why this matters</strong> — if a CQC inspector asks which questions staff were tested on during a specific period, you can open this tab, filter to that date range, and show the exact questions used. It also means you can confidently update questions over time without losing the historical record.</p>
        <p><strong className="text-neutral-dark">Date filter</strong> — use the From and To date pickers to narrow the view to versions saved within a specific date range. Click <strong className="text-neutral-dark">Clear</strong> to reset the filter and see all versions again.</p>
        <p><strong className="text-neutral-dark">Building the history</strong> — history only appears after questions have been saved at least once. A module with no saved versions will not appear here. Each save on the Modules &amp; Questions tab adds a new entry automatically.</p>
      </HelpAccordion>

      {/* Date filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
        <span className="text-xs font-medium text-neutral-mid">Filter by date</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-mid">From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-dark focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-mid">To</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-dark focus:border-teal focus:outline-none"
          />
        </div>
        {(filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterFrom(''); setFilterTo('') }}
            className="text-xs text-neutral-mid hover:text-red-500"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-neutral-mid">
          {totalVersions} version{totalVersions !== 1 ? 's' : ''} across {filtered.length} module{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <History size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-neutral-dark">
            {allVersions.length === 0 ? 'No question history yet' : 'No versions match the selected dates'}
          </p>
          <p className="mt-1 text-sm text-neutral-mid">
            {allVersions.length === 0
              ? 'Save questions on the Modules & Questions tab to start building a version history.'
              : 'Try adjusting or clearing the date filter.'}
          </p>
        </div>
      ) : (
      <div className="space-y-4">
      {filtered.map(({ module: m, versions }) => (
        <div key={m.id} className="rounded-card border border-gray-100 bg-white shadow-card">
          {/* Module header */}
          <button
            onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-neutral-light/40"
          >
            <div className="flex items-center gap-3">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                m.category === 'statutory' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'
              }`}>
                {m.category === 'statutory' ? 'S' : 'Sp'}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-dark">{m.name}</p>
                <p className="text-xs text-neutral-mid">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} · latest v{versions[0].version} · {new Date(versions[0].created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <ChevronDown size={15} className={`text-neutral-mid transition-transform ${expanded === m.id ? 'rotate-180' : ''}`} />
          </button>

          {expanded === m.id && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
              {versions.map((v: any) => (
                <div key={v.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  {/* Version header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-bold text-teal">v{v.version}</span>
                      <span className="text-xs font-medium text-neutral-dark">
                        {(v.questions as any[]).length} question{(v.questions as any[]).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-right text-xs text-neutral-mid">
                      <p>{new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {v.created_by && <p className="text-neutral-mid/60">Saved by {v.created_by}</p>}
                    </div>
                  </div>

                  {/* Questions list */}
                  <ol className="space-y-3">
                    {(v.questions as any[]).map((q: any, i: number) => {
                      const LABELS = ['A', 'B', 'C', 'D']
                      return (
                        <li key={i} className="rounded-lg border border-gray-100 bg-white p-3">
                          <p className="mb-2 text-sm font-medium text-neutral-dark">{i + 1}. {q.text}</p>
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="space-y-1">
                              {q.options.map((opt: string, oi: number) => (
                                <p key={oi} className={`text-xs ${q.correct === oi ? 'font-semibold text-teal' : 'text-neutral-mid'}`}>
                                  {LABELS[oi]}. {opt}{q.correct === oi ? ' ✓' : ''}
                                </p>
                              ))}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      </div>
      )}
    </div>
  )
}

// ─── Delivery tab ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const TRIGGER_LABELS: Record<string, string> = {
  manual:          'Manual send',
  scheduled:       'Scheduled rule',
  return_to_work:  'Return to work',
  post_incident:   'Post-incident',
  quizme:          'On-demand (/quizme)',
  spaced_repetition: 'Spaced repetition',
}
const AUDIENCE_LABELS: Record<string, string> = {
  all:        'All staff',
  day_shift:  'Day shift only',
  night_shift:'Night shift only',
  specific:   'Specific staff',
}

function RuleModal({ api, modules, staff, rule, onClose, onSaved }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
  staff:   Staff[]
  rule:    any | null
  onClose: () => void
  onSaved: (r: any) => void
}) {
  const [form, setForm] = useState({
    name:               rule?.name               ?? '',
    module_id:          rule?.module_id          ?? '',
    target_audience:    rule?.target_audience    ?? 'all',
    target_user_ids:    (rule?.target_user_ids   ?? []) as string[],
    days_of_week:       (rule?.days_of_week      ?? [1, 2, 3, 4, 5]) as number[],
    send_time:          rule?.send_time          ?? '09:00',
    questions_per_send: rule?.questions_per_send ?? 3,
    frequency_cap_week: rule?.frequency_cap_week ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function toggleDay(d: number) {
    setForm(p => ({
      ...p,
      days_of_week: p.days_of_week.includes(d)
        ? p.days_of_week.filter(x => x !== d)
        : [...p.days_of_week, d].sort(),
    }))
  }

  function toggleUser(id: string) {
    setForm(p => ({
      ...p,
      target_user_ids: p.target_user_ids.includes(id)
        ? p.target_user_ids.filter(x => x !== id)
        : [...p.target_user_ids, id],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Rule name is required'); return }
    setSaving(true); setError('')
    const payload = {
      name:               form.name.trim(),
      module_id:          form.module_id || undefined,
      target_audience:    form.target_audience,
      target_user_ids:    form.target_audience === 'specific' ? form.target_user_ids : [],
      days_of_week:       form.days_of_week,
      send_time:          form.send_time || undefined,
      questions_per_send: Number(form.questions_per_send) || 3,
      frequency_cap_week: form.frequency_cap_week ? Number(form.frequency_cap_week) : null,
    }
    try {
      const res = rule
        ? await api.training.updateDeliveryRule(rule.id, payload)
        : await api.training.createDeliveryRule(payload)
      onSaved(res.rule)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save rule')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">{rule ? 'Edit rule' : 'New delivery rule'}</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 py-5">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Rule name</label>
            <input
              type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Monday morning questions"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {/* Module */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Module <span className="text-neutral-mid font-normal">(optional — blank = all active modules)</span></label>
            <select
              value={form.module_id}
              onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            >
              <option value="">— All modules —</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Target audience */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Send to</label>
            <select
              value={form.target_audience}
              onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            >
              <option value="all">All staff</option>
              <option value="day_shift">Day shift only</option>
              <option value="night_shift">Night shift only</option>
              <option value="specific">Specific staff members</option>
            </select>
          </div>

          {/* Specific staff picker */}
          {form.target_audience === 'specific' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
                Select staff ({form.target_user_ids.length} selected)
              </label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {staff.map(s => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1 hover:bg-neutral-light">
                    <input type="checkbox" checked={form.target_user_ids.includes(s.id)} onChange={() => toggleUser(s.id)} className="h-4 w-4 accent-teal" />
                    <span className="text-sm text-neutral-dark">{s.name}</span>
                    <span className="text-xs text-neutral-mid">{s.job_role ?? ''}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Days of week */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-dark">Send on these days</label>
            <div className="flex gap-2">
              {DAY_NAMES.map((d, i) => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    form.days_of_week.includes(i)
                      ? 'bg-teal text-white'
                      : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time + questions per send */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Send at (time)</label>
              <input
                type="time" value={form.send_time}
                onChange={e => setForm(p => ({ ...p, send_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Questions per send</label>
              <select
                value={form.questions_per_send}
                onChange={e => setForm(p => ({ ...p, questions_per_send: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} question{n !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency cap */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Max questions per staff per week <span className="font-normal text-neutral-mid">(optional — prevents overloading staff)</span>
            </label>
            <input
              type="number" min="1" max="20"
              value={form.frequency_cap_week}
              onChange={e => setForm(p => ({ ...p, frequency_cap_week: e.target.value }))}
              placeholder="e.g. 5 (leave blank for no limit)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> {rule ? 'Save changes' : 'Create rule'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeliveryTab({ api, modules, staff }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
  staff:   Staff[]
}) {
  const [rules,       setRules]       = useState<any[]>([])
  const [rulesLoading,setRulesLoading]= useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editRule,    setEditRule]    = useState<any | null>(null)
  const [triggerLoad, setTriggerLoad] = useState<string | null>(null)
  const [triggerMsg,  setTriggerMsg]  = useState<Record<string, string>>({})
  const [sendLog,     setSendLog]     = useState<any[]>([])
  const [logLoading,  setLogLoading]  = useState(true)

  // Quick-action state
  const [qsModule,    setQsModule]    = useState('')
  const [qsAudience,  setQsAudience]  = useState('all')
  const [qsQCount,    setQsQCount]    = useState(3)
  const [qsSending,   setQsSending]   = useState(false)
  const [qsResult,    setQsResult]    = useState('')

  const [rtwUser,     setRtwUser]     = useState('')
  const [rtwModule,   setRtwModule]   = useState('')
  const [rtwNotes,    setRtwNotes]    = useState('')
  const [rtwSending,  setRtwSending]  = useState(false)
  const [rtwResult,   setRtwResult]   = useState('')

  const [piModule,    setPiModule]    = useState('')
  const [piAudience,  setPiAudience]  = useState('all')
  const [piDesc,      setPiDesc]      = useState('')
  const [piSending,   setPiSending]   = useState(false)
  const [piResult,    setPiResult]    = useState('')

  useEffect(() => {
    api.training.deliveryRules()
      .then(d => setRules(d.rules))
      .catch(() => {})
      .finally(() => setRulesLoading(false))
    api.training.sendLog(30)
      .then(d => setSendLog(d.logs))
      .catch(() => {})
      .finally(() => setLogLoading(false))
  }, [])

  async function toggleActive(r: any) {
    try {
      const updated = await api.training.updateDeliveryRule(r.id, { is_active: !r.is_active })
      setRules(p => p.map(x => x.id === r.id ? updated.rule : x))
    } catch { /* ignore */ }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule? This cannot be undone.')) return
    await api.training.deleteDeliveryRule(id).catch(() => {})
    setRules(p => p.filter(r => r.id !== id))
  }

  async function triggerRule(r: any) {
    setTriggerLoad(r.id)
    try {
      const res = await api.training.triggerRule(r.id)
      setTriggerMsg(p => ({ ...p, [r.id]: `Sent to ${res.sent_to} staff member${res.sent_to !== 1 ? 's' : ''}` }))
      setTimeout(() => setTriggerMsg(p => { const n = { ...p }; delete n[r.id]; return n }), 3000)
      const logRes = await api.training.sendLog(30)
      setSendLog(logRes.logs)
    } catch { /* ignore */ } finally { setTriggerLoad(null) }
  }

  async function manualSend() {
    if (!qsModule) { setQsResult('Please select a module'); return }
    setQsSending(true); setQsResult('')
    try {
      const res = await api.training.manualSend({ module_id: qsModule, target_audience: qsAudience, questions_per_send: qsQCount })
      setQsResult(`Sent to ${res.sent_to} staff member${res.sent_to !== 1 ? 's' : ''}`)
      const logRes = await api.training.sendLog(30)
      setSendLog(logRes.logs)
    } catch (e: any) {
      setQsResult(e.message ?? 'Send failed')
    } finally { setQsSending(false) }
  }

  async function returnToWork() {
    if (!rtwUser) { setRtwResult('Please select a staff member'); return }
    setRtwSending(true); setRtwResult('')
    try {
      const res = await api.training.returnToWork({ user_id: rtwUser, module_id: rtwModule || undefined, notes: rtwNotes || undefined })
      setRtwResult(`Return-to-work questions sent to ${res.staff_name}`)
      setRtwUser(''); setRtwModule(''); setRtwNotes('')
      const logRes = await api.training.sendLog(30)
      setSendLog(logRes.logs)
    } catch (e: any) {
      setRtwResult(e.message ?? 'Failed to trigger')
    } finally { setRtwSending(false) }
  }

  async function postIncident() {
    if (!piModule)  { setPiResult('Please select a module'); return }
    if (!piDesc.trim()) { setPiResult('Please describe the incident'); return }
    setPiSending(true); setPiResult('')
    try {
      const res = await api.training.postIncident({ module_id: piModule, target_audience: piAudience, incident_description: piDesc })
      setPiResult(`Sent to ${res.sent_to} staff member${res.sent_to !== 1 ? 's' : ''}`)
      setPiModule(''); setPiDesc('')
      const logRes = await api.training.sendLog(30)
      setSendLog(logRes.logs)
    } catch (e: any) {
      setPiResult(e.message ?? 'Failed to trigger')
    } finally { setPiSending(false) }
  }

  return (
    <div className="space-y-8">
      <HelpAccordion title="How Question Delivery works">
        <p><strong className="text-neutral-dark">What this tab does</strong> — once you have created and locked your training questions, this tab controls how and when those questions are delivered to your staff. Questions can be sent automatically on a schedule, triggered manually, or fired in response to specific events.</p>
        <p><strong className="text-neutral-dark">Scheduled rules</strong> — create a rule to automatically send questions to your staff on specific days of the week at a set time. You can target all staff, day shift only, night shift only, or specific named individuals. Set a weekly question cap to make sure staff are not overwhelmed if multiple rules overlap.</p>
        <p><strong className="text-neutral-dark">Manual send</strong> — push questions to staff immediately without a schedule. Useful before an inspection, when a new policy has been issued, or for ad-hoc refreshers.</p>
        <p><strong className="text-neutral-dark">Return to work</strong> — when a staff member returns from a period of absence, trigger a short 3-question refresher to bring safety protocols back to top of mind. Select the staff member and the most relevant module.</p>
        <p><strong className="text-neutral-dark">Post-incident trigger</strong> — if an incident has occurred in your home (e.g. a medication error, a slip or trip), use this to instantly push a targeted question about the relevant policy to all staff or just the relevant shift. This turns a mistake into immediate, anonymous micro-learning and creates a dated record of the response for CQC purposes.</p>
        <p><strong className="text-neutral-dark">Send log</strong> — every delivery is recorded here showing who received questions, which module, when, and what triggered the send. This forms part of your training audit trail.</p>
      </HelpAccordion>

      {/* ── Scheduled Rules ──────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-neutral-dark">Scheduled rules</h2>
            <p className="text-xs text-neutral-mid">Automatic question delivery on a recurring schedule</p>
          </div>
          <button
            onClick={() => { setEditRule(null); setShowModal(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
          >
            <Plus size={14} /> New rule
          </button>
        </div>

        {rulesLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-neutral-mid" /></div>
        ) : rules.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <Clock size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-neutral-dark">No scheduled rules yet</p>
            <p className="mt-1 text-sm text-neutral-mid">Create a rule to automatically send questions to your staff on a regular cadence.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
            {rules.map(r => {
              const mod = modules.find(m => m.id === r.module_id)
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(r)}
                        title={r.is_active ? 'Rule active — click to pause' : 'Rule paused — click to activate'}
                        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${r.is_active ? 'bg-teal' : 'bg-gray-200'}`}
                      >
                        <span className={`block h-4 w-4 translate-y-0 rounded-full bg-white shadow transition-transform ${r.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-neutral-dark">{r.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                          <span>{AUDIENCE_LABELS[r.target_audience] ?? r.target_audience}</span>
                          <span>·</span>
                          <span>
                            {r.days_of_week.length > 0
                              ? r.days_of_week.map((d: number) => DAY_NAMES[d]).join(', ')
                              : 'No days set'}
                            {r.send_time && ` at ${r.send_time}`}
                          </span>
                          <span>·</span>
                          <span>{r.questions_per_send} question{r.questions_per_send !== 1 ? 's' : ''} per send</span>
                          {mod && <><span>·</span><span className="text-teal">{mod.name}</span></>}
                          {r.frequency_cap_week && <><span>·</span><span>max {r.frequency_cap_week}/wk</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {triggerMsg[r.id] ? (
                        <span className="text-xs font-medium text-green-600"><CheckCircle2 size={12} className="mr-1 inline" />{triggerMsg[r.id]}</span>
                      ) : (
                        <button
                          onClick={() => triggerRule(r)}
                          disabled={triggerLoad === r.id}
                          title="Send now"
                          className="flex items-center gap-1 rounded-md border border-teal/30 bg-teal/5 px-2.5 py-1 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
                        >
                          {triggerLoad === r.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          Send now
                        </button>
                      )}
                      <button onClick={() => { setEditRule(r); setShowModal(true) }} title="Edit" className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">
                        <Plus size={13} className="rotate-45" />
                      </button>
                      <button onClick={() => deleteRule(r.id)} title="Delete" className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 font-semibold text-neutral-dark">Quick actions</h2>
        <div className="grid gap-5 md:grid-cols-3">

          {/* Manual send */}
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10"><Sparkles size={15} className="text-teal" /></div>
              <div>
                <p className="text-sm font-semibold text-neutral-dark">Manual send</p>
                <p className="text-xs text-neutral-mid">Push questions now</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <select value={qsModule} onChange={e => setQsModule(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                <option value="">— Select module —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={qsAudience} onChange={e => setQsAudience(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                  <option value="all">All staff</option>
                  <option value="day_shift">Day shift</option>
                  <option value="night_shift">Night shift</option>
                </select>
                <select value={qsQCount} onChange={e => setQsQCount(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}Q</option>)}
                </select>
              </div>
              <button onClick={manualSend} disabled={qsSending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                {qsSending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Sparkles size={13} /> Send now</>}
              </button>
              {qsResult && <p className={`text-xs font-medium ${qsResult.includes('Sent') ? 'text-green-600' : 'text-red-500'}`}>{qsResult}</p>}
            </div>
          </div>

          {/* Return to work */}
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><ShieldCheck size={15} className="text-amber-600" /></div>
              <div>
                <p className="text-sm font-semibold text-neutral-dark">Return to work</p>
                <p className="text-xs text-neutral-mid">3-question refresher pulse</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <select value={rtwUser} onChange={e => setRtwUser(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                <option value="">— Select staff member —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.job_role ? ` (${s.job_role})` : ''}</option>)}
              </select>
              <select value={rtwModule} onChange={e => setRtwModule(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                <option value="">— Module (optional) —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="text" value={rtwNotes} onChange={e => setRtwNotes(e.target.value)}
                placeholder="Notes e.g. returned from 3-week sick leave"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              <button onClick={returnToWork} disabled={rtwSending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                {rtwSending ? <><Loader2 size={13} className="animate-spin" /> Triggering…</> : <><ShieldCheck size={13} /> Trigger pulse</>}
              </button>
              {rtwResult && <p className={`text-xs font-medium ${rtwResult.includes('Sent') || rtwResult.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>{rtwResult}</p>}
            </div>
          </div>

          {/* Post-incident */}
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50"><AlertCircle size={15} className="text-red-500" /></div>
              <div>
                <p className="text-sm font-semibold text-neutral-dark">Post-incident</p>
                <p className="text-xs text-neutral-mid">Immediate policy question push</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <select value={piModule} onChange={e => setPiModule(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                <option value="">— Related module —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={piAudience} onChange={e => setPiAudience(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                <option value="all">All staff</option>
                <option value="day_shift">Day shift</option>
                <option value="night_shift">Night shift</option>
              </select>
              <textarea value={piDesc} onChange={e => setPiDesc(e.target.value)}
                rows={3} placeholder="Brief incident description (recorded in the audit log)…"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              <button onClick={postIncident} disabled={piSending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {piSending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><AlertCircle size={13} /> Trigger now</>}
              </button>
              {piResult && <p className={`text-xs font-medium ${piResult.includes('Sent') ? 'text-green-600' : 'text-red-500'}`}>{piResult}</p>}
            </div>
          </div>

        </div>
      </div>

      {/* ── Send Log ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 font-semibold text-neutral-dark">Recent send log</h2>
        {logLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-neutral-mid" /></div>
        ) : sendLog.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <History size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-neutral-dark">No sends yet</p>
            <p className="mt-1 text-sm text-neutral-mid">Every time questions are sent to staff, it will be recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-mid">Staff member</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-mid">Module</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-mid">Trigger</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-mid">Context / notes</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-mid">Date &amp; time</th>
                </tr>
              </thead>
              <tbody>
                {sendLog.map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-dark">{l.user?.name ?? '—'}</p>
                      <p className="text-xs text-neutral-mid">{l.user?.job_role ?? ''}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-mid">{l.module?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.trigger_type === 'post_incident'  ? 'bg-red-50 text-red-600'    :
                        l.trigger_type === 'return_to_work' ? 'bg-amber-50 text-amber-600':
                        l.trigger_type === 'scheduled'      ? 'bg-blue-50 text-blue-600'  :
                        'bg-teal/10 text-teal'
                      }`}>
                        {TRIGGER_LABELS[l.trigger_type] ?? l.trigger_type}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-xs text-neutral-mid">
                      <span className="line-clamp-2">{l.context ?? '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-neutral-mid">
                      {new Date(l.sent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RuleModal
          api={api}
          modules={modules}
          staff={staff}
          rule={editRule}
          onClose={() => { setShowModal(false); setEditRule(null) }}
          onSaved={r => {
            setRules(p => editRule ? p.map(x => x.id === r.id ? r : x) : [...p, r])
            setShowModal(false); setEditRule(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const { data: session } = useSession()
  const [tab,         setTab]         = useState<'compliance' | 'modules' | 'history' | 'delivery'>('compliance')
  const trainingCache = pageCache.get<{ staff: Staff[]; modules: Module[]; enrollments: Enrollment[] }>('admin-training')
  const [staff,       setStaff]       = useState<Staff[]>(trainingCache?.staff ?? [])
  const [modules,     setModules]     = useState<Module[]>(trainingCache?.modules ?? [])
  const [enrollments, setEnrollments] = useState<Enrollment[]>(trainingCache?.enrollments ?? [])
  const [loading,     setLoading]     = useState(!trainingCache)
  const [error,       setError]       = useState('')
  const [showAssign,  setShowAssign]  = useState(false)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)

  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  async function load() {
    if (!api) return
    try {
      const [modulesRes, complianceRes] = await Promise.all([
        api.training.modules(),
        api.training.compliance(),
      ])
      setModules(modulesRes.modules as Module[])
      setStaff(complianceRes.users)
      setEnrollments(complianceRes.enrollments)
      pageCache.set('admin-training', {
        staff: complianceRes.users,
        modules: modulesRes.modules as Module[],
        enrollments: complianceRes.enrollments,
      })
    } catch (e: any) {
      setError(e.message ?? 'Failed to load training data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session?.accessToken])

  // Derive unique modules that have been assigned (or show all)
  const assignedModuleIds = new Set(enrollments.map(e => e.module_id))
  const gridModules = modules.filter(m => assignedModuleIds.has(m.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  // Build lookup: enrollmentsByUserAndModule[userId][moduleId] = enrollment
  const enrollmentMap: Record<string, Record<string, Enrollment>> = {}
  for (const e of enrollments) {
    if (!enrollmentMap[e.user_id]) enrollmentMap[e.user_id] = {}
    enrollmentMap[e.user_id][e.module_id] = e
  }

  // Summary stats
  const now = new Date()
  const statutoryModules = modules.filter(m => m.category === 'statutory')
  const staffCompliantCount = staff.filter(s => {
    return statutoryModules.length === 0 || statutoryModules.every(m => {
      const e = enrollmentMap[s.id]?.[m.id]
      return e?.status === 'complete' && (!e.expires_at || new Date(e.expires_at) > now)
    })
  }).length
  const expiringSoonCount = enrollments.filter(e =>
    e.status === 'complete' && e.daysUntilExpiry !== null && e.daysUntilExpiry <= 90 && e.daysUntilExpiry > 0
  ).length
  const expiredCount = enrollments.filter(e => e.status === 'expired').length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Training &amp; Compliance</h1>
          <p className="mt-1 text-sm text-neutral-mid">Track statutory and specialist training across your team.</p>
        </div>
        {tab === 'compliance' && (
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
          >
            <Plus size={15} /> Assign training
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1 w-fit">
        {([
          { key: 'compliance', label: 'Compliance' },
          { key: 'modules',    label: 'Modules & Questions' },
          { key: 'history',    label: 'Question History' },
          { key: 'delivery',   label: 'Delivery' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-neutral-dark shadow-sm'
                : 'text-neutral-mid hover:text-neutral-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {tab === 'modules'  && api && <ModulesTab api={api} modules={modules} />}
      {tab === 'history'  && api && <HistoryTab api={api} modules={modules} />}
      {tab === 'delivery' && api && <DeliveryTab api={api} modules={modules} staff={staff} />}

      {tab === 'compliance' && <>

      <HelpAccordion title="How Compliance Tracking works">
        <p><strong className="text-neutral-dark">What this tab does</strong> — the compliance grid gives you a live, at-a-glance view of every staff member's training status across every assigned module. Each cell shows the status for that person and module combination.</p>
        <p><strong className="text-neutral-dark">Status icons</strong> — a green tick means the module is complete and current; an amber alert means it expires within 90 days and needs renewing soon; a red alert means it has expired and action is required; a teal clock means the staff member has started but not yet finished; a grey clock means they have been assigned but not started. A dash means the module has not been assigned to that person.</p>
        <p><strong className="text-neutral-dark">Assigning training</strong> — click <strong className="text-neutral-dark">Assign training</strong> (top right) to assign one or more modules to individual staff members or your whole team at once. You can optionally set a due date. Statutory modules (marked S) are required annually for all regulated staff; specialist modules (marked Sp) can be assigned as needed.</p>
        <p><strong className="text-neutral-dark">Viewing a training record</strong> — click any cell that has a status icon to open the full training record for that staff member and module. You can see the answers they gave, the correct answers, their completion date, and when the training expires. You can also mark a module complete manually or remove the assignment from here.</p>
        <p><strong className="text-neutral-dark">Renewal reminders</strong> — the system automatically sends reminder messages to staff at 90, 30, and 7 days before their renewal date via their preferred channel. Managers receive a weekly digest listing all upcoming renewals so nothing is missed.</p>
        <p><strong className="text-neutral-dark">Summary cards</strong> — the four cards at the top show your overall compliance position at a glance: how many staff are fully compliant with all statutory modules, how many have training expiring within 90 days, how many have expired training, and how many modules are in your library.</p>
      </HelpAccordion>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Fully compliant staff',    value: `${staffCompliantCount}/${staff.length}`, colour: 'text-green-600',  bg: 'bg-green-50',  note: 'all statutory modules current' },
          { label: 'Expiring within 90 days',  value: expiringSoonCount,                        colour: 'text-amber-600',  bg: 'bg-amber-50',  note: 'need renewal soon'             },
          { label: 'Expired / overdue',         value: expiredCount,                             colour: 'text-red-600',    bg: 'bg-red-50',    note: 'action required'               },
          { label: 'Modules in library',        value: modules.length,                           colour: 'text-teal',       bg: 'bg-teal-light/30', note: `${statutoryModules.length} statutory`},
        ].map(card => (
          <div key={card.label} className={`rounded-card ${card.bg} border border-white/60 p-4 shadow-sm`}>
            <p className="text-xs font-medium text-neutral-mid">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.colour}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">{card.note}</p>
          </div>
        ))}
      </div>

      {/* Compliance grid */}
      {gridModules.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-neutral-dark">No training assigned yet</p>
          <p className="mt-1 text-sm text-neutral-mid">
            Click <strong>Assign training</strong> to assign modules to your team.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left text-xs font-medium text-neutral-mid min-w-[180px]">
                  Staff member
                </th>
                {gridModules.map(m => (
                  <th key={m.id} className="px-3 py-3 text-center text-xs font-medium text-neutral-mid min-w-[90px] max-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.category === 'statutory' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'}`}>
                        {m.category === 'statutory' ? 'S' : 'Sp'}
                      </span>
                      <span className="leading-tight">{m.name.length > 16 ? m.name.slice(0, 14) + '…' : m.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 hover:bg-neutral-light/30">
                    <p className="font-medium text-neutral-dark">{s.name}</p>
                    <p className="text-xs text-neutral-mid">{s.job_role ?? s.email}</p>
                  </td>
                  {gridModules.map(m => {
                    const enrollment = enrollmentMap[s.id]?.[m.id]
                    return (
                      <td key={m.id} className="px-3 py-3 text-center">
                        <button
                          onClick={() => enrollment && setSelectedEnrollmentId(enrollment.id)}
                          className={enrollment ? 'cursor-pointer' : 'cursor-default'}
                          title={enrollment ? `${m.name} — ${enrollment.status.replace('_', ' ')}` : `${m.name} — not assigned`}
                        >
                          <StatusCell enrollment={enrollment} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={11} /></span> Complete
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertCircle size={11} /></span> Expiring soon
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertCircle size={11} /></span> Expired
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal"><Clock size={10} /></span> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-300"><Clock size={10} /></span> Not started
            </span>
            <span className="flex items-center gap-1.5"><span className="text-gray-300 font-bold">—</span> Not assigned</span>
            <span className="ml-auto">
              <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal">S</span> Statutory &nbsp;
              <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500">Sp</span> Specialist
            </span>
          </div>
        </div>
      )}

      </> }

      {showAssign && api && (
        <AssignModal
          api={api}
          staff={staff}
          modules={modules}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); setLoading(true); load() }}
        />
      )}

      {selectedEnrollmentId && api && (
        <EnrollmentModal
          api={api}
          enrollmentId={selectedEnrollmentId}
          onClose={() => setSelectedEnrollmentId(null)}
          onUpdated={() => { setSelectedEnrollmentId(null); setLoading(true); load() }}
        />
      )}
    </div>
  )
}
