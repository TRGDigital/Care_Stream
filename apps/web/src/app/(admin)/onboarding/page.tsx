'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { BookOpen, ChevronDown, ChevronRight, Info, MessageSquare, Plus, Trash2, Users, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import type { Flow } from '@/components/admin/onboarding/onboarding-shared'

// Flow form & progress modals are lazy-loaded — only fetched when opened.
const FlowForm = dynamic(() => import('@/components/admin/onboarding/onboarding-modals').then(m => m.FlowForm), { ssr: false })
const ProgressPanel = dynamic(() => import('@/components/admin/onboarding/onboarding-modals').then(m => m.ProgressPanel), { ssr: false })

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
  const userId = session?.user?.email ?? 'guest'
  const [flows,    setFlows]    = useState<Flow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState<Flow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string | null; flow_kind: string; job_roles: string[]; step_count: number; read_count: number; question_count: number; already_adopted: boolean }>>([])
  const [genericPolicies, setGenericPolicies] = useState<Array<{ id: string; name: string; document_category: string; already_adopted: boolean }>>([])
  const [adoptingId, setAdoptingId] = useState<string | null>(null)
  const [adoptingPolicyId, setAdoptingPolicyId] = useState<string | null>(null)
  const [adoptNote, setAdoptNote] = useState('')
  const [tab, setTab] = useState<'active' | 'ready'>('active')

  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  async function load() {
    if (!api) return
    try {
      const [d, t, gp] = await Promise.all([
        api.onboarding.listFlows(),
        api.onboarding.listTemplates().catch(() => ({ templates: [] })),
        api.onboarding.listGenericPolicies().catch(() => ({ policies: [] })),
      ])
      setFlows(d.flows)
      setTemplates(t.templates)
      setGenericPolicies(gp.policies)
      persistentCache.set(`admin-onboarding-${userId}`, d.flows)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function adopt(templateId: string) {
    if (!api) return
    setAdoptingId(templateId); setError(''); setAdoptNote('')
    try {
      const { flow, unmapped } = await api.onboarding.adoptTemplate(templateId)
      setAdoptNote(
        unmapped > 0
          ? `Added "${flow.name}". ${unmapped} step${unmapped === 1 ? '' : 's'} couldn't be matched to one of your policies — open the flow to map them.`
          : `Added "${flow.name}" and matched every step to your policies.`
      )
      await load()
    } catch (e: any) { setError(e.message ?? 'Could not adopt template') } finally { setAdoptingId(null) }
  }

  async function adoptGenericPolicy(policyId: string) {
    if (!api) return
    setAdoptingPolicyId(policyId); setError(''); setAdoptNote('')
    try {
      const { flow } = await api.onboarding.adoptGenericPolicy(policyId)
      setAdoptNote(`Added "${flow.name}" as a one-step onboarding flow. Open it in Active flows to enrol staff.`)
      await load()
    } catch (e: any) { setError(e.message ?? 'Could not add the policy') } finally { setAdoptingPolicyId(null) }
  }

  useEffect(() => {
    const cached = persistentCache.get<Flow[]>(`admin-onboarding-${userId}`)
    if (cached) { setFlows(cached); setLoading(false) }
  }, [userId])

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
        <p><strong className="text-neutral-dark">What is an onboarding flow?</strong> — A flow is a structured sequence of steps you assign to new starters. Each step is either a policy to read or a question to answer. Staff complete steps in order through the Chat Hub or email — no separate app or login needed.</p>
        <p><strong className="text-neutral-dark">Creating steps</strong> — when building a flow you can add two types of step: <em>Read policy</em> links a staff member to one of your uploaded documents; <em>Answer question</em> asks them to write a short free-text response that is saved against their record as evidence.</p>
        <p><strong className="text-neutral-dark">Job roles & assignment</strong> — each flow can be targeted at specific job roles (e.g. Care Assistant, Senior Carer). When you activate a flow, staff in those roles are automatically enrolled and receive a notification to start.</p>
        <p><strong className="text-neutral-dark">Tracking progress</strong> — the progress panel inside each flow shows every enrolled staff member, how many steps they have completed, whether they are overdue, and a percentage completion bar. Use this as CQC evidence of structured induction.</p>
        <p><strong className="text-neutral-dark">Getting started</strong> — click <strong className="text-neutral-dark">New flow</strong> to create your first onboarding flow. The preview below shows an example of a completed flow so you can see how it looks.</p>
      </HelpAccordion>

      {error && (
        <div className="mb-4 rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {adoptNote && (
        <div className="mb-4 rounded-card border border-teal/20 bg-teal-light/30 px-4 py-3 text-sm text-neutral-dark">{adoptNote}</div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex gap-6 border-b border-gray-200">
        {([['active', 'Active flows', flows.length], ['ready', 'Ready-made flows', templates.length + genericPolicies.length]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${tab === key ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-neutral-mid">{count}</span>
          </button>
        ))}
      </div>

      {/* Ready-made flows from CareStream */}
      {tab === 'ready' && (
        templates.length === 0 && genericPolicies.length === 0 ? (
          <div className="rounded-card border border-gray-100 bg-white px-5 py-10 text-center text-sm text-neutral-mid shadow-card">
            No ready-made flows are available right now.
          </div>
        ) : (
          <div className="space-y-5">
          {templates.length > 0 && (
          <div className="rounded-card border border-gray-100 bg-white shadow-card">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-dark">Ready-made onboarding flows</h2>
              <p className="mt-0.5 text-xs text-neutral-mid">Adopt a CareStream induction for a role — we&rsquo;ll map each step to your own policies. Once adopted it moves to <strong>Active flows</strong>, where you can edit it.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(t => (
                <div key={t.id} className="flex flex-col rounded-lg border border-gray-200 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-neutral-dark">{t.name}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-mid">{t.flow_kind === 'secondary' ? 'Specialism' : 'Role'}</span>
                  </div>
                  <p className="mb-3 flex-1 text-xs text-neutral-mid">{t.read_count} policies to read · {t.question_count} questions</p>
                  {t.already_adopted ? (
                    <span className="flex items-center justify-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"><CheckCircle2 size={12} /> Adopted</span>
                  ) : (
                    <button
                      onClick={() => adopt(t.id)}
                      disabled={adoptingId === t.id}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                    >
                      {adoptingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {adoptingId === t.id ? 'Adding & matching…' : 'Adopt'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Generic onboarding policies — your own policies flagged for onboarding (amber, to set them apart). */}
          {genericPolicies.length > 0 && (
          <div className="rounded-card border border-amber-200 bg-white shadow-card">
            <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-dark">Generic onboarding policies</h2>
              <p className="mt-0.5 text-xs text-neutral-mid">Your own policies flagged as <strong>Generic Onboarding</strong>. Add one as a simple <strong>read-and-confirm</strong> onboarding flow, then enrol staff from <strong>Active flows</strong>.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {genericPolicies.map(p => (
                <div key={p.id} className="flex flex-col rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-neutral-dark">{p.name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Policy</span>
                  </div>
                  <p className="mb-3 flex-1 text-xs text-neutral-mid">One step · read &amp; confirm this policy</p>
                  {p.already_adopted ? (
                    <span className="flex items-center justify-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"><CheckCircle2 size={12} /> Added</span>
                  ) : (
                    <button
                      onClick={() => adoptGenericPolicy(p.id)}
                      disabled={adoptingPolicyId === p.id}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {adoptingPolicyId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {adoptingPolicyId === p.id ? 'Adding…' : 'Add as onboarding flow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}
          </div>
        )
      )}

      {/* Active flows */}
      {tab === 'active' && <>
      {flows.length === 0 && !showForm && (
        templates.some(t => !t.already_adopted) ? (
          <div className="mb-4 rounded-card border border-teal/20 bg-teal-light/20 px-5 py-4 text-sm text-neutral-dark">
            You have no active flows yet. Head to the <button onClick={() => setTab('ready')} className="font-semibold text-teal underline">Ready-made flows</button> tab to adopt one, or create your own with <strong>New flow</strong>.
          </div>
        ) : <DemoPreview />
      )}

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
      </>}

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
