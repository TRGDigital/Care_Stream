'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { BookOpen, ChevronDown, ChevronRight, Info, MessageSquare, Plus, Trash2, Users, CheckCircle2, Clock, AlertCircle, X, GripVertical } from 'lucide-react'

type Step = { title: string; type: 'read_policy' | 'answer_question'; policy_id?: string; question?: string }
type Flow  = {
  id: string; name: string; description?: string; job_roles: string[]; is_active: boolean
  steps: Array<Step & { id: string; order: number }>
  enrollments: Array<{ id: string; completed_at: string | null }>
}

// ─── Help accordion ───────────────────────────────────────────────────────────

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

// ─── Demo preview ─────────────────────────────────────────────────────────────

function DemoPreview() {
  const steps = [
    { id: 1, title: 'Read the Health & Safety Policy',                                    type: 'read_policy'     },
    { id: 2, title: 'Review the Medication Administration Policy',                        type: 'read_policy'     },
    { id: 3, title: 'Read the Moving & Handling Procedure',                               type: 'read_policy'     },
    { id: 4, title: 'What should you do if you witness a medication error?',              type: 'answer_question' },
    { id: 5, title: 'Read the Safeguarding Adults Policy',                                type: 'read_policy'     },
    { id: 6, title: 'Describe the correct procedure for a care documentation handover',   type: 'answer_question' },
    { id: 7, title: 'Read the Infection Control Policy',                                  type: 'read_policy'     },
    { id: 8, title: 'What steps would you take if a resident showed signs of infection?', type: 'answer_question' },
  ]

  const enrollments = [
    { name: 'Sarah Johnson',    role: 'Care Assistant',        done: 8, total: 8, completedAt: '12 May 2026', dueDate: null,          overdue: false },
    { name: 'Michael Thompson', role: 'Care Assistant',        done: 6, total: 8, completedAt: null,          dueDate: '20 May 2026', overdue: false },
    { name: 'Emma Davis',       role: 'Senior Care Assistant', done: 4, total: 8, completedAt: null,          dueDate: null,          overdue: false },
    { name: 'James Wilson',     role: 'Care Assistant',        done: 1, total: 8, completedAt: null,          dueDate: '10 May 2026', overdue: true  },
    { name: 'Lisa Patel',       role: 'Senior Care Assistant', done: 0, total: 8, completedAt: null,          dueDate: '16 May 2026', overdue: false },
  ]

  const totalDone = enrollments.filter(e => e.completedAt).length

  return (
    <div>
      {/* Preview banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="mt-0.5 shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
          Preview
        </span>
        <p className="text-sm text-amber-800">
          This is an example of a completed onboarding flow so you can see how it looks. Click{' '}
          <strong>New flow</strong> above to create your first real one.
        </p>
      </div>

      {/* Flow card */}
      <div className="mb-6 rounded-card border border-teal ring-1 ring-teal bg-white shadow-card">
        <div className="flex items-start justify-between px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-neutral-dark truncate">New Starter Induction</p>
              <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
            </div>
            <p className="mt-0.5 text-sm text-neutral-mid">Mandatory induction for all new staff joining the care home team</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-mid">
              <span className="flex items-center gap-1"><BookOpen size={11} /> 8 steps</span>
              <span className="flex items-center gap-1"><Users size={11} /> {enrollments.length} enrolled</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> {totalDone} complete</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">Care Assistant</span>
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">Senior Care Assistant</span>
            </div>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-1">
            <span className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid">Edit</span>
            <span className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid">Pause</span>
          </div>
        </div>
      </div>

      {/* Progress panel */}
      <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="font-semibold text-neutral-dark">New Starter Induction — Staff Progress</p>
            <p className="mt-0.5 text-xs text-neutral-mid">
              8 steps &middot; {enrollments.length} enrolled &middot; {totalDone} complete
            </p>
          </div>
          <span className="flex cursor-default items-center gap-1.5 rounded-lg bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal">
            <Users size={12} /> Enroll staff
          </span>
        </div>

        <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">

          {/* Steps list */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Induction Steps</p>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-xs font-semibold text-gray-400">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-neutral-dark">{step.title}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {step.type === 'read_policy' ? (
                        <>
                          <BookOpen size={10} className="text-teal" />
                          <span className="text-xs text-teal">Read policy</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={10} className="text-indigo-500" />
                          <span className="text-xs text-indigo-500">Answer question</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff progress */}
          <div className="px-6 py-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Staff Progress</p>
            <div className="space-y-5">
              {enrollments.map((e, i) => {
                const pct = Math.round((e.done / e.total) * 100)
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-neutral-dark">{e.name}</p>
                        {e.completedAt && (
                          <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">Complete</span>
                        )}
                        {e.overdue && !e.completedAt && (
                          <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-500">Overdue</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-mid">{e.role}</p>
                      {e.completedAt && (
                        <p className="text-xs text-neutral-mid">Completed {e.completedAt}</p>
                      )}
                      {e.dueDate && !e.completedAt && (
                        <p className={`text-xs ${e.overdue ? 'text-red-500 font-medium' : 'text-neutral-mid'}`}>
                          Due {e.dueDate}
                        </p>
                      )}
                    </div>
                    <div className="w-28 shrink-0">
                      <div className="mb-1.5 flex items-center justify-end gap-1.5">
                        {e.completedAt ? (
                          <CheckCircle2 size={13} className="text-green-500" />
                        ) : e.overdue ? (
                          <AlertCircle size={13} className="text-red-400" />
                        ) : (
                          <Clock size={13} className="text-amber-400" />
                        )}
                        <span className="text-xs font-medium text-neutral-mid">{e.done}/{e.total}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            e.completedAt ? 'bg-green-400' : e.overdue ? 'bg-red-400' : 'bg-teal'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs text-neutral-mid">{pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary row */}
            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-neutral-mid">Team overview</p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-teal"
                    style={{ width: `${Math.round((totalDone / enrollments.length) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-neutral-mid">
                  {totalDone}/{enrollments.length} completed
                </span>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-neutral-mid">
                <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500" /> {totalDone} complete</span>
                <span className="flex items-center gap-1"><AlertCircle size={10} className="text-red-400" /> 1 overdue</span>
                <span className="flex items-center gap-1"><Clock size={10} className="text-amber-400" /> {enrollments.length - totalDone - 1} in progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data: session } = useSession()
  const [flows,    setFlows]    = useState<Flow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState<Flow | null>(null)
  const [showForm, setShowForm] = useState(false)

  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  async function load() {
    if (!api) return
    try {
      const d = await api.onboarding.listFlows()
      setFlows(d.flows)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session?.accessToken])

  async function deleteFlow(id: string) {
    if (!api || !confirm('Delete this flow? All enrollments and progress will be removed.')) return
    await api.onboarding.deleteFlow(id)
    setFlows(prev => prev.filter(f => f.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function toggleActive(flow: Flow) {
    if (!api) return
    const updated = await api.onboarding.updateFlow(flow.id, { is_active: !flow.is_active })
    setFlows(prev => prev.map(f => f.id === flow.id ? updated.flow : f))
    if (selected?.id === flow.id) setSelected(updated.flow)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 animate-pulse rounded bg-gray-100" />
        {[1,2].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Onboarding & Induction</h1>
          <p className="mt-1 text-sm text-neutral-mid">Build step-by-step induction flows for new staff.</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
        >
          <Plus size={15} /> New flow
        </button>
      </div>

      <HelpAccordion title="How Onboarding & Induction works">
        <p><strong className="text-neutral-dark">What is an onboarding flow?</strong> — A flow is a structured sequence of steps you assign to new starters. Each step is either a policy to read or a question to answer. Staff complete steps in order through the chat portal, WhatsApp, or email — no separate app or login needed.</p>
        <p><strong className="text-neutral-dark">Creating steps</strong> — when building a flow you can add two types of step: <em>Read policy</em> links a staff member to one of your uploaded documents; <em>Answer question</em> asks them to write a short free-text response that is saved against their record as evidence.</p>
        <p><strong className="text-neutral-dark">Job roles & assignment</strong> — each flow can be targeted at specific job roles (e.g. Care Assistant, Senior Carer). When you activate a flow, staff in those roles are automatically enrolled and receive a notification to start.</p>
        <p><strong className="text-neutral-dark">Tracking progress</strong> — the progress panel inside each flow shows every enrolled staff member, how many steps they have completed, whether they are overdue, and a percentage completion bar. Use this as CQC evidence of structured induction.</p>
        <p><strong className="text-neutral-dark">Getting started</strong> — click <strong className="text-neutral-dark">New flow</strong> to create your first onboarding flow. The preview below shows an example of a completed flow so you can see how it looks.</p>
      </HelpAccordion>

      {error && (
        <div className="mb-4 rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {flows.length === 0 && !showForm && <DemoPreview />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {flows.map(flow => {
          const done  = flow.enrollments.filter(e => e.completed_at).length
          const total = flow.enrollments.length
          return (
            <div
              key={flow.id}
              className={`rounded-card border bg-white shadow-card transition-all ${selected?.id === flow.id ? 'border-teal ring-1 ring-teal' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-dark truncate">{flow.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${flow.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {flow.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {flow.description && <p className="mt-0.5 text-sm text-neutral-mid truncate">{flow.description}</p>}
                  <div className="mt-2 flex items-center gap-4 text-xs text-neutral-mid">
                    <span className="flex items-center gap-1"><BookOpen size={11} /> {flow.steps.length} step{flow.steps.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {total} enrolled</span>
                    {total > 0 && <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> {done} complete</span>}
                  </div>
                  {flow.job_roles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {flow.job_roles.map(r => (
                        <span key={r} className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setSelected(flow); setShowForm(false) }}
                    className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal"
                    title="View progress"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => { setSelected(flow); setShowForm(true) }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-teal"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(flow)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid hover:bg-neutral-light"
                  >
                    {flow.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => deleteFlow(flow.id)}
                    className="rounded-md p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <FlowForm
          api={api!}
          initial={selected}
          onClose={() => setShowForm(false)}
          onSaved={(flow) => {
            setFlows(prev => {
              const idx = prev.findIndex(f => f.id === flow.id)
              return idx >= 0 ? prev.map(f => f.id === flow.id ? flow : f) : [flow, ...prev]
            })
            setSelected(flow)
            setShowForm(false)
          }}
        />
      )}

      {selected && !showForm && (
        <ProgressPanel
          api={api!}
          flow={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ─── Flow Form ────────────────────────────────────────────────────────────────

function FlowForm({ api, initial, onClose, onSaved }: {
  api: ReturnType<typeof createApiClient>
  initial: Flow | null
  onClose: () => void
  onSaved: (flow: Flow) => void
}) {
  const [name,        setName]        = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [jobRoles,    setJobRoles]    = useState<string[]>(initial?.job_roles ?? [])
  const [newRole,     setNewRole]     = useState('')
  const [steps,       setSteps]       = useState<Step[]>(
    initial?.steps.map(s => ({ title: s.title, type: s.type, policy_id: s.policy_id, question: s.question })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  function addStep(type: 'read_policy' | 'answer_question') {
    setSteps(prev => [...prev, { title: '', type, policy_id: '', question: '' }])
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  async function save() {
    if (!name.trim()) { setErr('Flow name is required'); return }
    if (steps.some(s => !s.title.trim())) { setErr('All steps need a title'); return }
    if (steps.some(s => s.type === 'answer_question' && !s.question?.trim())) { setErr('Question steps need a question'); return }
    setSaving(true)
    setErr('')
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, job_roles: jobRoles, steps }
      const result = initial
        ? await api.onboarding.updateFlow(initial.id, payload)
        : await api.onboarding.createFlow(payload)
      onSaved(result.flow)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">{initial ? 'Edit flow' : 'New onboarding flow'}</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">Flow name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Starter Induction"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              Applies to job roles <span className="normal-case font-normal text-gray-400">(leave blank for all staff)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {jobRoles.map(r => (
                <span key={r} className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">
                  {r}
                  <button onClick={() => setJobRoles(prev => prev.filter(x => x !== r))}><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newRole} onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newRole.trim()) { setJobRoles(p => [...p, newRole.trim()]); setNewRole('') } }}
                placeholder="e.g. Care Assistant" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              <button onClick={() => { if (newRole.trim()) { setJobRoles(p => [...p, newRole.trim()]); setNewRole('') } }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-neutral-light">Add</button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">Steps</label>
            {steps.length === 0 && (
              <p className="mb-3 text-sm text-neutral-mid">No steps yet. Add a step below.</p>
            )}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical size={14} className="text-gray-300" />
                    <span className="text-xs font-medium text-neutral-mid">Step {i + 1} — {step.type === 'read_policy' ? 'Read Policy' : 'Answer Question'}</span>
                    <button onClick={() => removeStep(i)} className="ml-auto text-gray-300 hover:text-red-400"><X size={14} /></button>
                  </div>
                  <input value={step.title} onChange={e => updateStep(i, { title: e.target.value })}
                    placeholder="Step title (e.g. Read Medication Policy)"
                    className="mb-2 w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                  {step.type === 'read_policy' && (
                    <input value={step.policy_id ?? ''} onChange={e => updateStep(i, { policy_id: e.target.value })}
                      placeholder="Policy ID (optional — links the step to a specific policy)"
                      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-neutral-mid focus:border-teal focus:outline-none" />
                  )}
                  {step.type === 'answer_question' && (
                    <textarea value={step.question ?? ''} onChange={e => updateStep(i, { question: e.target.value })}
                      placeholder="The question staff must answer (Claude will assess the answer)"
                      rows={2}
                      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => addStep('read_policy')}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-neutral-mid hover:border-teal hover:text-teal">
                <Plus size={12} /> Read policy
              </button>
              <button onClick={() => addStep('answer_question')}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-neutral-mid hover:border-teal hover:text-teal">
                <Plus size={12} /> Answer question
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create flow'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Progress Panel ───────────────────────────────────────────────────────────

function ProgressPanel({ api, flow, onClose }: {
  api: ReturnType<typeof createApiClient>
  flow: Flow
  onClose: () => void
}) {
  const [data,    setData]    = useState<{ flow: any; enrollments: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [enrollModal, setEnrollModal] = useState(false)

  useEffect(() => {
    api.onboarding.flowProgress(flow.id)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [flow.id])

  return (
    <div className="mt-6 rounded-card border border-gray-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <p className="font-semibold text-neutral-dark">{flow.name} — Staff Progress</p>
          <p className="text-xs text-neutral-mid mt-0.5">{flow.steps.length} step{flow.steps.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEnrollModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90"
          >
            <Users size={12} /> Enroll staff
          </button>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading && <div className="h-24 animate-pulse rounded bg-gray-50" />}
        {error   && <p className="text-sm text-red-600">{error}</p>}
        {data && data.enrollments.length === 0 && (
          <p className="text-sm text-neutral-mid">No staff enrolled yet. Click &ldquo;Enroll staff&rdquo; to get started.</p>
        )}
        {data && data.enrollments.length > 0 && (
          <div className="divide-y divide-gray-50">
            {data.enrollments.map((e: any) => {
              const pct = e.steps_total > 0 ? Math.round((e.steps_done / e.steps_total) * 100) : 0
              return (
                <div key={e.enrollment_id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-neutral-dark">{e.user.name}</p>
                    <p className="text-xs text-neutral-mid">{e.user.job_role ?? e.user.email}</p>
                  </div>
                  <div className="w-32 text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      {e.completed_at ? (
                        <CheckCircle2 size={13} className="text-green-500" />
                      ) : e.due_date && new Date(e.due_date) < new Date() ? (
                        <AlertCircle size={13} className="text-red-400" />
                      ) : (
                        <Clock size={13} className="text-amber-400" />
                      )}
                      <span className="text-xs text-neutral-mid">{e.steps_done}/{e.steps_total}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {enrollModal && (
        <EnrollModal
          api={api}
          flowId={flow.id}
          onClose={() => setEnrollModal(false)}
          onEnrolled={() => {
            setEnrollModal(false)
            setLoading(true)
            api.onboarding.flowProgress(flow.id).then(setData).finally(() => setLoading(false))
          }}
        />
      )}
    </div>
  )
}

// ─── Enroll Modal ─────────────────────────────────────────────────────────────

function EnrollModal({ api, flowId, onClose, onEnrolled }: {
  api: ReturnType<typeof createApiClient>
  flowId: string
  onClose: () => void
  onEnrolled: () => void
}) {
  const [users,    setUsers]    = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dueDate,  setDueDate]  = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    api.users.list().then(d => setUsers(d.users.filter((u: any) => u.is_active))).finally(() => setLoading(false))
  }, [])

  async function enroll() {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await api.onboarding.enroll(flowId, { user_ids: [...selected], due_date: dueDate || undefined })
      onEnrolled()
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="font-semibold text-neutral-dark">Enroll staff</p>
          <button onClick={onClose}><X size={16} className="text-neutral-mid" /></button>
        </div>
        <div className="px-5 py-4">
          {loading && <div className="h-20 animate-pulse rounded bg-gray-50" />}
          {!loading && (
            <>
              <div className="mb-3 max-h-60 overflow-y-auto divide-y divide-gray-50">
                {users.map(u => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)}
                      className="h-4 w-4 rounded border-gray-300 text-teal accent-teal" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-dark">{u.name}</p>
                      <p className="text-xs text-neutral-mid">{u.job_role ?? u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Due date (optional)</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          <button onClick={enroll} disabled={selected.size === 0 || saving}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {saving ? 'Enrolling…' : `Enroll ${selected.size > 0 ? selected.size : ''} staff`}
          </button>
        </div>
      </div>
    </div>
  )
}
