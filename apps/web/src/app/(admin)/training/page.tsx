'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient, apiAssetUrl } from '@/lib/api-client'
import { AiCreditsBar } from '@/components/ai-usage'
import { persistentCache } from '@/lib/page-cache'
import {
  AlertCircle, CheckCircle2, ChevronDown, Clock, GraduationCap, History,
  Info, Lock, Loader2, Plus, Save, ShieldCheck, Sparkles, Trash2, Unlock, Users, Eye,
  Search, X,
} from 'lucide-react'
import { ModulePreviewPlayer } from '@/components/training/module-preview-player'
import { FaceToFaceManager } from '@/components/admin/face-to-face/face-to-face-manager'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { UpgradePanel, LockChip } from '@/components/admin/upgrade-gate'
import {
  emptyQuestion, isComplete, McqQuestionEditor,
  DAY_NAMES, type Module, type Staff, type Enrollment, type Question,
} from '@/components/admin/training/training-shared'

// Modals are lazy-loaded — only fetched when a dialog is opened.
const AssignModal          = dynamic(() => import('@/components/admin/training/training-modals').then(m => m.AssignModal),          { ssr: false })
const EnrollmentModal      = dynamic(() => import('@/components/admin/training/training-modals').then(m => m.EnrollmentModal),      { ssr: false })
const PerModuleAssignModal = dynamic(() => import('@/components/admin/training/training-modals').then(m => m.PerModuleAssignModal), { ssr: false })
const RuleModal            = dynamic(() => import('@/components/admin/training/training-modals').then(m => m.RuleModal),            { ssr: false })

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

// Shared compact matrix shell (sticky staff column, horizontal scroll, legend).
function MatrixShell({ icon, title, count, legend, head, children }: {
  icon: React.ReactNode; title: string; count?: string; legend: React.ReactNode
  head: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-neutral-dark">{title}</h2>
        {count && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">{count}</span>}
      </div>
      <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left text-xs font-medium text-neutral-mid min-w-[180px]">Staff member</th>
            {head}
          </tr></thead>
          <tbody>{children}</tbody>
        </table>
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">{legend}</div>
      </div>
    </div>
  )
}

// RAG glyph badge (face-to-face matrix).
const F2F_STYLE: Record<string, { cls: string; glyph: string; label: string }> = {
  in_date:  { cls: 'bg-green-100 text-green-700',                          glyph: '✓', label: 'In date' },
  due_soon: { cls: 'bg-amber-100 text-amber-700',                         glyph: '⏳', label: 'Due soon' },
  overdue:  { cls: 'bg-red-100 text-red-700',                             glyph: '✕', label: 'Overdue' },
  missing:  { cls: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-300', glyph: '!', label: 'Missing (required)' },
  none:     { cls: 'bg-neutral-light/60 text-neutral-mid/50',             glyph: '·', label: 'Not recorded' },
}

function F2FComplianceMatrix({ token, enabled, userId }: { token: string; enabled: boolean; userId: string }) {
  const [data, setData] = useState<any>(() => persistentCache.get<any>(`admin-f2f-matrix-${userId}`) ?? null)
  useEffect(() => {
    if (!token || !enabled) return
    createApiClient(token).faceToFace.matrix().then(d => { setData(d); persistentCache.set(`admin-f2f-matrix-${userId}`, d) }).catch(() => {})
  }, [token, enabled, userId])
  if (!enabled || !data || data.topics.length === 0 || data.staff.length === 0) return null
  return (
    <MatrixShell
      icon={<Users size={16} className="text-teal" />}
      title="Face-to-face training"
      count={`${data.staff.length} staff · ${data.topics.length} topic${data.topics.length === 1 ? '' : 's'}`}
      head={data.topics.map((t: any) => (
        <th key={t.key} className="px-3 py-3 text-center text-xs font-medium text-neutral-mid min-w-[80px] max-w-[110px]"><span className="block leading-tight">{t.label.length > 16 ? t.label.slice(0, 14) + '…' : t.label}</span></th>
      ))}
      legend={<>
        {(['in_date', 'due_soon', 'overdue', 'missing', 'none'] as const).map(k => (
          <span key={k} className="flex items-center gap-1.5"><span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${F2F_STYLE[k].cls}`}>{F2F_STYLE[k].glyph}</span>{F2F_STYLE[k].label}</span>
        ))}
        <span className="ml-auto">Renewals &amp; mandatory-by-role are managed in the Face-to-face tab</span>
      </>}
    >
      {data.staff.map((s: any) => {
        const cellByKey = new Map(s.cells.map((c: any) => [c.topic_key, c]))
        return (
          <tr key={s.user_id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
            <td className="sticky left-0 z-10 bg-white px-5 py-3"><p className="font-medium text-neutral-dark">{s.name}</p><p className="text-xs text-neutral-mid">{s.job_role ?? 'Staff'}</p></td>
            {data.topics.map((t: any) => {
              const c: any = cellByKey.get(t.key) ?? { status: 'none' }
              const st = F2F_STYLE[c.status] ?? F2F_STYLE.none
              return <td key={t.key} className="px-3 py-3 text-center"><span title={`${t.label} — ${st.label}`} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${st.cls}`}>{st.glyph}</span></td>
            })}
          </tr>
        )
      })}
    </MatrixShell>
  )
}

function OnboardingStatusCell({ cell }: { cell: any }) {
  if (!cell) return <span className="text-gray-300 text-sm">—</span>
  const t = `${cell.steps_done}/${cell.steps_total} steps`
  if (cell.status === 'complete')    return <span title={`Complete · ${t}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={14} /></span>
  if (cell.status === 'overdue')     return <span title={`Overdue · ${t}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertCircle size={14} /></span>
  if (cell.status === 'in_progress') return <span title={`In progress · ${t}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal"><Clock size={12} /></span>
  return <span title={`Not started · ${t}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-300"><Clock size={12} /></span>
}

function OnboardingComplianceMatrix({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<any>(() => persistentCache.get<any>(`admin-onboarding-matrix-${userId}`) ?? null)
  useEffect(() => {
    if (!token) return
    createApiClient(token).onboarding.matrix().then(d => { setData(d); persistentCache.set(`admin-onboarding-matrix-${userId}`, d) }).catch(() => {})
  }, [token, userId])
  if (!data || data.flows.length === 0 || data.staff.length === 0) return null
  return (
    <MatrixShell
      icon={<ShieldCheck size={16} className="text-teal" />}
      title="Staff onboarding"
      count={`${data.staff.length} staff · ${data.flows.length} flow${data.flows.length === 1 ? '' : 's'}`}
      head={data.flows.map((f: any) => (
        <th key={f.id} className="px-3 py-3 text-center text-xs font-medium text-neutral-mid min-w-[90px] max-w-[130px]"><span className="block leading-tight">{f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name}</span></th>
      ))}
      legend={<>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={11} /></span> Complete</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertCircle size={11} /></span> Overdue</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal"><Clock size={10} /></span> In progress</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-300"><Clock size={10} /></span> Not started</span>
        <span className="flex items-center gap-1.5"><span className="text-gray-300 font-bold">—</span> Not enrolled</span>
      </>}
    >
      {data.staff.map((s: any) => (
        <tr key={s.user_id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
          <td className="sticky left-0 z-10 bg-white px-5 py-3"><p className="font-medium text-neutral-dark">{s.name}</p><p className="text-xs text-neutral-mid">{s.job_role ?? 'Staff'}</p></td>
          {data.flows.map((f: any) => <td key={f.id} className="px-3 py-3 text-center"><OnboardingStatusCell cell={s.cells[f.id]} /></td>)}
        </tr>
      ))}
    </MatrixShell>
  )
}


// ─── Modules tab ──────────────────────────────────────────────────────────────


function ModulesTab({ api, modules, staff, enrollments, onAssigned }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
  staff:   Staff[]
  enrollments: Enrollment[]
  onAssigned: () => void
}) {
  const [assignFor,  setAssignFor]  = useState<Module | null>(null)  // individual-assign modal
  const [assignBusy, setAssignBusy] = useState<string | null>(null)  // module id during "assign all"
  const [assignMsg,  setAssignMsg]  = useState<Record<string, string>>({})
  const [search,     setSearch]     = useState('')   // filter the (now large) adhoc module list

  // Staff currently assigned each module (for the "X assigned" count).
  const assignedByModule = (() => {
    const map: Record<string, Set<string>> = {}
    for (const e of enrollments) { (map[e.module_id] ??= new Set()).add(e.user_id) }
    return map
  })()

  async function assignAll(m: Module) {
    if (!staff.length) { setAssignMsg(p => ({ ...p, [m.id]: 'No staff to assign.' })); return }
    if (!confirm(`Assign "${m.name}" to all ${staff.length} staff members?`)) return
    setAssignBusy(m.id)
    try {
      const r = await api.training.enroll({ user_ids: staff.map(s => s.id), module_ids: [m.id] })
      setAssignMsg(p => ({ ...p, [m.id]: `Assigned to ${r.enrolled ?? staff.length} staff.` }))
      onAssigned()
    } catch (e: any) { setAssignMsg(p => ({ ...p, [m.id]: e.message ?? 'Failed to assign.' })) }
    finally { setAssignBusy(null); setTimeout(() => setAssignMsg(p => { const n = { ...p }; delete n[m.id]; return n }), 3000) }
  }

  const [open,           setOpen]           = useState<string | null>(null)
  const [editing,        setEditing]        = useState<Record<string, Question[]>>({})
  const [dirty,          setDirty]          = useState<Set<string>>(new Set())
  const [savedQuestions, setSavedQuestions] = useState<Record<string, Question[]>>({})
  const [saving,         setSaving]         = useState<string | null>(null)
  const [saved,          setSaved]          = useState<string | null>(null)
  const [genLoading,    setGenLoading]    = useState<Record<string, 'questions' | 'answers' | 'lesson' | null>>({})
  const [preview,       setPreview]       = useState<{ id: string; name: string } | null>(null)
  const moduleHasLesson = (m: any) => Array.isArray(m?.learning_content?.sections) && m.learning_content.sections.length > 0
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

  async function generateLesson(m: Module) {
    if (!confirm('Build a full scenario-based lesson (teach → real care scenario → quick check) and a fresh question bank for this module, grounded in your policies?\n\nIt reuses the matching standard module\'s images where available. Your current questions will be replaced. Uses 1 AI credit.')) return
    setGenLoading(p => ({ ...p, [m.id]: 'lesson' }))
    setGenError(p => ({ ...p, [m.id]: '' }))
    try {
      const r = await api.training.generateLesson(m.id)
      // Load the generated questions into the editor + mark dirty + open, so the Save
      // button is available to review and save (the lesson sections are already saved).
      const typed: Question[] = (Array.isArray(r.module?.questions) ? r.module.questions : []).map((q: any) => ({
        id:      q.id,
        text:    q.text,
        options: (q.options ?? ['', '', '', '']).slice(0, 4) as [string, string, string, string],
        correct: (q.correct ?? 0) as 0 | 1 | 2 | 3,
      }))
      setEditing(p => ({ ...p, [m.id]: typed }))
      setDirty(p => new Set(p).add(m.id))
      setOpen(m.id)
      onAssigned() // reload modules so the lesson + Preview button + image appear
    } catch (e: any) {
      setGenError(p => ({ ...p, [m.id]: e.message ?? 'Lesson generation failed' }))
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

  const q = search.trim().toLowerCase()
  const matchesSearch = (m: Module) => !q || m.name.toLowerCase().includes(q)
  const statutory  = modules.filter(m => m.category === 'statutory' && matchesSearch(m))
  const specialist = modules.filter(m => m.category === 'specialist' && matchesSearch(m))
  const totalMatches = statutory.length + specialist.length

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
                    {m.illustration_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={apiAssetUrl(m.illustration_url) ?? ''} alt="" className="h-10 w-16 shrink-0 rounded-md border border-gray-100 object-cover" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-neutral-dark">{m.name}</p>
                        {moduleHasLesson(m) && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            <CheckCircle2 size={10} /> Module Generated
                          </span>
                        )}
                      </div>
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
                        onClick={() => generateLesson(m)}
                        disabled={!!genLoading[m.id] || isLocked}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                      >
                        {genLoading[m.id] === 'lesson'
                          ? <><Loader2 size={12} className="animate-spin" /> Building lesson…</>
                          : <><Sparkles size={12} /> Generate lesson &amp; questions</>
                        }
                      </button>
                      <button
                        onClick={() => generateQuestions(m)}
                        disabled={!!genLoading[m.id] || isLocked}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40"
                      >
                        {genLoading[m.id] === 'questions'
                          ? <><Loader2 size={12} className="animate-spin" /> Generating questions…</>
                          : <><Sparkles size={12} /> Questions only</>
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
                      {moduleHasLesson(m) && (
                        <button
                          onClick={() => setPreview({ id: m.id, name: m.name })}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"
                        >
                          <Eye size={12} /> Preview
                        </button>
                      )}
                      <button
                        onClick={() => save(m)}
                        disabled={saving === m.id || !isDirty || isLocked}
                        className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-40"
                      >
                        {saving === m.id
                          ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                          : saved === m.id
                            ? <><CheckCircle2 size={12} /> Saved</>
                            : <><Save size={12} /> Save</>
                        }
                      </button>
                      <span className="text-[10px] text-neutral-mid">AI generates questions using your Knowledge seed and care setting context</span>
                    </div>
                    {genError[m.id] && (
                      <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{genError[m.id]}</p>
                    )}

                    {/* Assign this module to staff */}
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-neutral-light/40 p-3">
                      <span className="flex items-center gap-1 text-xs font-medium text-neutral-dark"><Users size={13} className="text-teal" /> Assign this module:</span>
                      <button onClick={() => setAssignFor(m)} className="rounded-lg border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal hover:text-white">Assign to specific staff…</button>
                      <button onClick={() => assignAll(m)} disabled={assignBusy === m.id} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{assignBusy === m.id ? <><Loader2 size={12} className="animate-spin" /> Assigning…</> : `Assign to all staff (${staff.length})`}</button>
                      <span className="text-[11px] text-neutral-mid">{assignedByModule[m.id]?.size ?? 0} of {staff.length} currently assigned</span>
                      {assignMsg[m.id] && <span className="text-[11px] font-medium text-green-600">{assignMsg[m.id]}</span>}
                      {incomplete && <span className="flex w-full items-center gap-1 text-[11px] text-amber-600"><AlertCircle size={11} /> Generate answer options before staff can be assessed — they&apos;ll see a placeholder until then.</span>}
                    </div>

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

  if (preview) return <StatutoryModulePreview api={api} id={preview.id} name={preview.name} onBack={() => setPreview(null)} />

  return (
    <div>
      <HelpAccordion title="How Adhoc Training Modules &amp; Questions work">
        <p><strong className="text-neutral-dark">What this tab does</strong> — build each training module your staff complete in the hub. A module can be a full scenario-based lesson (a short lesson taught through real care-home scenarios, then an assessment) or just an assessment question set. Staff take it in their first language.</p>
        <p><strong className="text-neutral-dark">The best way to build a module</strong> — click <strong className="text-blue-700">Generate lesson &amp; questions</strong>. The AI writes a full lesson (each section teaches a point, then applies it through a real scenario and a quick check) plus a fresh assessment bank, grounded in your own policies, and reuses the matching standard module&apos;s images. Staff then play it step by step in <strong className="text-neutral-dark">My Training</strong>, exactly like Annual training. Click <strong className="text-neutral-dark">Preview</strong> to step through it yourself first.</p>
        <p><strong className="text-neutral-dark">Questions-only modules</strong> — if you just want an assessment with no lesson, use <strong className="text-purple-700">Questions only</strong> (or write your own question texts and use <strong className="text-purple-700">Generate answer options</strong> to fill in the A/B/C/D choices). These appear in My Training as a simple question list.</p>
        <p><strong className="text-neutral-dark">Question format</strong> — every question has four options (A, B, C, D). Click the letter circle next to an option to mark it correct (it highlights teal). A question is complete when it has a text and all four options. Incomplete questions are flagged in amber.</p>
        <p><strong className="text-neutral-dark">Saving, versions &amp; locking</strong> — click <strong className="text-neutral-dark">Save changes</strong> to save (each save is a new version in Question History). After saving a complete set, <strong className="text-neutral-dark">Lock questions</strong> records a date-stamped audit trail for CQC evidence; <strong className="text-neutral-dark">Unlock to edit</strong> reopens it.</p>

        <div className="mt-3 rounded-lg border border-gray-100 bg-neutral-light/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Button guide</p>
          <ul className="space-y-1.5 text-xs text-neutral-mid">
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-700"><Sparkles size={11} /> Generate lesson &amp; questions</span> Builds the full scenario lesson + assessment, reusing images. The recommended way.</li>
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 font-medium text-purple-700"><Sparkles size={11} /> Questions only</span> Generates just the assessment questions (no lesson).</li>
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 font-medium text-purple-700"><Sparkles size={11} /> Generate answer options</span> Fills the A/B/C/D options around question texts you&apos;ve written.</li>
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-0.5 font-medium text-neutral-dark"><Eye size={11} /> Preview</span> Steps through the lesson + questions read-only, as staff see it (shows once a lesson exists).</li>
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg bg-teal px-2 py-0.5 font-medium text-white"><Save size={11} /> Save changes</span> Saves your edits as a new version.</li>
            <li className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-0.5 font-medium text-neutral-dark"><Lock size={11} /> Lock / Unlock</span> Date-stamps the exact questions in use for CQC evidence.</li>
          </ul>
        </div>
      </HelpAccordion>

      {/* Search — the list now includes every standard/annual topic, so make it findable. */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search training modules…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-8 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          {search && (
            <button onClick={() => setSearch('')} title="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark"><X size={14} /></button>
          )}
        </div>
        {search && <span className="text-xs text-neutral-mid">{totalMatches} match{totalMatches === 1 ? '' : 'es'}</span>}
      </div>

      {search && totalMatches === 0 && (
        <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <Search size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-neutral-dark">No modules match &ldquo;{search}&rdquo;</p>
          <p className="mt-1 text-sm text-neutral-mid">Try a different search, or clear it to see all modules.</p>
        </div>
      )}

      {statutory.length  > 0 && renderGroup('Statutory modules', 'text-teal', statutory)}
      {specialist.length > 0 && renderGroup('Specialist modules', 'text-indigo-500', specialist)}

      {assignFor && (
        <PerModuleAssignModal
          api={api}
          module={assignFor}
          staff={staff}
          alreadyAssigned={assignedByModule[assignFor.id] ?? new Set()}
          onClose={() => setAssignFor(null)}
          onAssigned={() => { onAssigned(); setAssignFor(null) }}
        />
      )}
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
        <p><strong className="text-neutral-dark">What this tab does</strong> — every time you save questions on the Adhoc Training Modules &amp; Questions tab, a full snapshot of that question set is stored here. This gives you a permanent, time-stamped audit trail of every version of every module's questions.</p>
        <p><strong className="text-neutral-dark">Versions</strong> — each saved set is recorded as a new version (v1, v2, v3, and so on). The most recent version is shown first. Expanding a version reveals the complete question set as it was at that point in time, including the correct answers marked in teal.</p>
        <p><strong className="text-neutral-dark">Why this matters</strong> — if a CQC inspector asks which questions staff were tested on during a specific period, you can open this tab, filter to that date range, and show the exact questions used. It also means you can confidently update questions over time without losing the historical record.</p>
        <p><strong className="text-neutral-dark">Date filter</strong> — use the From and To date pickers to narrow the view to versions saved within a specific date range. Click <strong className="text-neutral-dark">Clear</strong> to reset the filter and see all versions again.</p>
        <p><strong className="text-neutral-dark">Building the history</strong> — history only appears after questions have been saved at least once. A module with no saved versions will not appear here. Each save on the Adhoc Training Modules &amp; Questions tab adds a new entry automatically.</p>
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
              ? 'Save questions on the Adhoc Training Modules & Questions tab to start building a version history.'
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

// ── Training-only clients: show ONLY the modules they bought, plus the rest of the
// library greyed out with a Buy-now button. (Full-suite tenants keep the grid below.)
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? ''
type CatalogueModule = { slug: string; title: string; description: string | null; illustration_url: string | null }

function TrainingOnlyTraining({ token }: { token: string | null }) {
  const [licences,  setLicences]  = useState<any[]>([])
  const [catalogue, setCatalogue] = useState<CatalogueModule[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!token) return
    const api = createApiClient(token)
    Promise.allSettled([
      api.training.licences(),
      fetch(`${PUBLIC_API}/public/training/standard-modules`).then(r => (r.ok ? r.json() : Promise.reject())),
    ]).then(([l, c]) => {
      if (l.status === 'fulfilled') setLicences((l.value as any)?.licences ?? [])
      if (c.status === 'fulfilled') setCatalogue(((c.value as any)?.data?.topics ?? []) as CatalogueModule[])
    }).finally(() => setLoading(false))
  }, [token])

  const owned = new Map<string, { name: string; total: number; allocated: number }>()
  for (const l of licences) {
    const g = owned.get(l.module_slug) ?? { name: l.module_name, total: 0, allocated: 0 }
    g.total += 1
    if (l.allocated_to) g.allocated += 1
    owned.set(l.module_slug, g)
  }
  const ownedSlugs = new Set(owned.keys())
  const purchased  = catalogue.filter(m => ownedSlugs.has(m.slug))
  const others     = catalogue.filter(m => !ownedSlugs.has(m.slug))
  const img = (u: string | null) => (!u ? null : u.startsWith('http') ? u : `${PUBLIC_API}${u}`)

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-64 animate-pulse rounded bg-gray-100" /><div className="h-32 animate-pulse rounded-xl bg-gray-100" /></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-dark">Your training</h1>
        <p className="mt-1 text-sm text-neutral-mid">The modules you&rsquo;ve purchased, plus the rest of the library you can add.</p>
      </div>

      {purchased.length === 0 ? (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 text-sm text-neutral-mid">You haven&rsquo;t purchased any training yet. Choose a module below to get started.</div>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {purchased.map(m => {
            const o = owned.get(m.slug)!
            return (
              <div key={m.slug} className="overflow-hidden rounded-xl border-2 border-blue-600 bg-white shadow-card">
                {img(m.illustration_url) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={img(m.illustration_url)!} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2"><ShieldCheck size={15} className="text-blue-600" /><p className="font-semibold text-neutral-dark">{m.title}</p></div>
                  <p className="text-xs text-neutral-mid">{o.total} licence{o.total === 1 ? '' : 's'} &middot; {o.allocated} allocated &middot; {o.total - o.allocated} available</p>
                  <Link href="/licences" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Allocate to staff</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-mid">More training to add</h2>
          <p className="mb-4 text-xs text-neutral-mid">Buy any of these modules to unlock them for your team.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map(m => (
              <div key={m.slug} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-card">
                {img(m.illustration_url)
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img(m.illustration_url)!} alt="" className="aspect-[16/9] w-full object-cover opacity-50 grayscale" />
                  : <div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100"><GraduationCap size={28} className="text-gray-300" /></div>}
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2"><Lock size={13} className="text-gray-400" /><p className="font-semibold text-neutral-mid">{m.title}</p></div>
                  {m.description && <p className="mb-3 line-clamp-2 text-xs text-gray-400">{m.description}</p>}
                  <Link href={`/buy/${m.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-600 hover:text-white">Buy now</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function TrainingPage() {
  const { data: session } = useSession()
  const { features } = usePlanFeatures()
  const f2fLocked = features != null && !features.has_face_to_face
  const trainingOnly = session?.user?.tier === 'training_only'
  const userId = session?.user?.email ?? 'guest'
  const [tab,         setTab]         = useState<'compliance' | 'modules' | 'history' | 'delivery' | 'face_to_face'>('compliance')
  const [staff,       setStaff]       = useState<Staff[]>([])
  const [modules,     setModules]     = useState<Module[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading,     setLoading]     = useState(true)
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
      persistentCache.set(`admin-training-${userId}`, {
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

  useEffect(() => {
    const cached = persistentCache.get<{ staff: Staff[]; modules: Module[]; enrollments: Enrollment[] }>(`admin-training-${userId}`)
    if (cached) {
      setStaff(cached.staff)
      setModules(cached.modules)
      setEnrollments(cached.enrollments)
      setLoading(false)
    }
  }, [userId])

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

  // Annual training (AI modules) — derived from the enrolments themselves, since
  // these modules aren't in the manual `modules` list.
  const annualEnrollments = enrollments.filter(e => e.module?.source === 'ai_generated')
  const annualModuleMap = new Map<string, { id: string; name: string; requires_practical?: boolean }>()
  for (const e of annualEnrollments) if (e.module && !annualModuleMap.has(e.module.id)) annualModuleMap.set(e.module.id, { id: e.module.id, name: e.module.name, requires_practical: e.module.requires_practical })
  const annualModules = [...annualModuleMap.values()].sort((a, b) => a.name.localeCompare(b.name))
  const annualStaffIds = new Set(annualEnrollments.map(e => e.user_id))
  const annualStaff = staff.filter(s => annualStaffIds.has(s.id))

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

  // Training-only clients get a restricted view: only the modules they purchased,
  // plus the rest of the library greyed out with a Buy-now button.
  if (trainingOnly) {
    return <TrainingOnlyTraining token={session?.accessToken ?? null} />
  }

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
      {trainingOnly && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-900">You assign training by allocating a purchased licence to a staff member.</p>
          <Link href="/licences" className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Go to Licences</Link>
        </div>
      )}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Training &amp; Compliance</h1>
          <p className="mt-1 text-sm text-neutral-mid">Track statutory and specialist training across your team.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/training/annual" className="flex items-center gap-2 rounded-lg border border-teal/40 bg-teal-light/30 px-4 py-2 text-sm font-medium text-teal hover:bg-teal-light/50">
            Annual training modules
          </Link>
          {tab === 'compliance' && !trainingOnly && (
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
            >
              <Plus size={15} /> Assign training
            </button>
          )}
        </div>
      </div>

      {session?.accessToken && tab === 'modules' && <AiCreditsBar token={session.accessToken} />}

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1 w-fit">
        {([
          { key: 'compliance', label: 'Compliance' },
          { key: 'modules',    label: 'Adhoc Training Modules & Questions' },
          { key: 'history',    label: 'Question History' },
          { key: 'delivery',   label: 'Schedule Training Questions Delivery' },
          { key: 'face_to_face', label: 'Face-to-face Training' },
        ] as const).map(t => {
          const isFtf = t.key === 'face_to_face'   // distinct colour to set it apart
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? (isFtf ? 'bg-teal text-white shadow-sm' : 'bg-white text-neutral-dark shadow-sm')
                  : (isFtf ? 'text-teal hover:text-teal/80' : 'text-neutral-mid hover:text-neutral-dark')
              }`}
            >
              {t.label}{isFtf && f2fLocked && <LockChip tier="Professional" />}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {tab === 'modules'  && api && <ModulesTab api={api} modules={modules} staff={staff} enrollments={enrollments} onAssigned={load} />}
      {tab === 'history'  && api && <HistoryTab api={api} modules={modules} />}
      {tab === 'delivery' && api && <DeliveryTab api={api} modules={modules} staff={staff} />}
      {tab === 'face_to_face' && (f2fLocked ? (
        <UpgradePanel
          title="Face-to-face Training"
          description="Record in-person training sessions, mark attendance, and see a combined training matrix across digital and face-to-face learning. Available on the Professional and Enterprise plans."
          tier="Professional"
        />
      ) : (
        <FaceToFaceManager token={session?.accessToken} />
      ))}

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

      {/* Compliance grid — adhoc / statutory / specialist */}
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={16} className="text-teal" />
        <h2 className="text-sm font-semibold text-neutral-dark">Adhoc, statutory &amp; specialist training</h2>
      </div>
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

      {/* Annual training compliance grid */}
      {annualModules.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap size={16} className="text-teal" />
            <h2 className="text-sm font-semibold text-neutral-dark">Annual training</h2>
            <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">{annualStaff.length} staff · {annualModules.length} module{annualModules.length === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left text-xs font-medium text-neutral-mid min-w-[180px]">Staff member</th>
                  {annualModules.map(m => (
                    <th key={m.id} className="px-3 py-3 text-center text-xs font-medium text-neutral-mid min-w-[90px] max-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        {m.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">+ prac</span>}
                        <span className="leading-tight">{m.name.length > 16 ? m.name.slice(0, 14) + '…' : m.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {annualStaff.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                      <p className="font-medium text-neutral-dark">{s.name}</p>
                      <p className="text-xs text-neutral-mid">{s.job_role ?? s.email}</p>
                    </td>
                    {annualModules.map(m => {
                      const enrollment = enrollmentMap[s.id]?.[m.id]
                      return (
                        <td key={m.id} className="px-3 py-3 text-center">
                          <button onClick={() => enrollment && setSelectedEnrollmentId(enrollment.id)} className={enrollment ? 'cursor-pointer' : 'cursor-default'} title={enrollment ? `${m.name} — ${enrollment.status.replace('_', ' ')}` : `${m.name} — not assigned`}>
                            <StatusCell enrollment={enrollment} />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
              <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={11} /></span> Passed</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertCircle size={11} /></span> Renewal due</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertCircle size={11} /></span> Overdue / expired</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal"><Clock size={10} /></span> In progress</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-300"><Clock size={10} /></span> Not started</span>
              <span className="ml-auto">Tap a cell for detail · scores &amp; certificates on the staff record</span>
            </div>
          </div>
        </div>
      )}

      {/* Face-to-face training matrix (only for plans with the feature) */}
      <F2FComplianceMatrix token={session?.accessToken ?? ''} enabled={!f2fLocked} userId={userId} />

      {/* Staff onboarding matrix */}
      <OnboardingComplianceMatrix token={session?.accessToken ?? ''} userId={userId} />

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

// Admin read-only preview of a tenant statutory module — the same stepped player
// staff/validators see (lesson sections then questions), not editable.
function StatutoryModulePreview({ api, id, name, onBack }: { api: ReturnType<typeof createApiClient>; id: string; name: string; onBack: () => void }) {
  const [m, setM] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    api.training.modulePreview(id)
      .then(d => setM(d.module))
      .catch((e: any) => setError(e?.message ?? 'Could not load the preview'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-3 text-sm text-neutral-mid hover:text-teal">&larr; Back</button>
      <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}</div>
    </div>
  )
  if (error || !m) return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-3 text-sm text-neutral-mid hover:text-teal">&larr; Back</button>
      <div className="rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error || 'Module not found'}</div>
    </div>
  )
  return <ModulePreviewPlayer m={m} name={name} onBack={onBack} />
}
