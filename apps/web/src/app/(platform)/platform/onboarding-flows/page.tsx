'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type OnboardingTemplate, type OnboardingTemplateStep } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Trash2, Sparkles, Check, ChevronDown, ChevronUp, BookOpen, HelpCircle, Power } from 'lucide-react'

// Standard policy sections (mirrors api DEFAULT_POLICY_SECTIONS) for the step dropdowns.
const SECTIONS = [
  'Activities', 'Admission management', 'Business procedures', 'Care and health of residents',
  'Complaints and compliments', 'Emergency planning', 'Fees and funding', 'GDPR', 'Governance',
  'Home Premises', 'Infection control', 'Quality Assurance', 'Safeguarding', 'Staff', 'Training',
]

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

export default function OnboardingFlowsPage() {
  const token = usePlatformAuth()
  const [flows,   setFlows]   = useState<OnboardingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState<string | null>(null)   // flowId currently mutating
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  function load() {
    if (!token) return
    createPlatformClient(token).onboardingTemplates.list()
      .then(d => setFlows(d.flows))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  function replaceFlow(f: OnboardingTemplate) {
    setFlows(prev => prev.map(x => x.id === f.id ? f : x))
  }

  async function seedRoles() {
    if (!token) return
    setSeeding(true); setError('')
    try {
      await createPlatformClient(token).onboardingTemplates.seedRoles()
      load()
    } catch (e: any) { setError(e.message) } finally { setSeeding(false) }
  }

  async function aiDraft(f: OnboardingTemplate) {
    if (!token) return
    setBusy(f.id); setError('')
    try {
      const { flow } = await createPlatformClient(token).onboardingTemplates.aiDraft(f.id)
      replaceFlow(flow); setOpenId(flow.id)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function toggleActive(f: OnboardingTemplate) {
    if (!token) return
    setBusy(f.id)
    try {
      const { flow } = await createPlatformClient(token).onboardingTemplates.update(f.id, { is_active: !f.is_active })
      replaceFlow(flow)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function remove(f: OnboardingTemplate) {
    if (!token || !confirm(`Delete the "${f.name}" template? This cannot be undone.`)) return
    setBusy(f.id)
    try {
      await createPlatformClient(token).onboardingTemplates.remove(f.id)
      setFlows(prev => prev.filter(x => x.id !== f.id))
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function saveSteps(f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string) {
    if (!token) return
    setBusy(f.id)
    try {
      const { flow } = await createPlatformClient(token).onboardingTemplates.update(f.id, { name, description, steps })
      replaceFlow(flow)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  const primary   = flows.filter(f => f.flow_kind === 'primary')
  const secondary = flows.filter(f => f.flow_kind === 'secondary')

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Onboarding Flows</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              Shared induction templates. Draft each with AI, review the steps, then activate so tenants can adopt them.
            </p>
          </div>
          <button onClick={seedRoles} disabled={seeding}
            className="flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal disabled:opacity-50">
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create role templates
          </button>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : flows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-neutral-mid">No onboarding templates yet.</p>
            <button onClick={seedRoles} disabled={seeding} className="mt-3 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              Create the standard role templates
            </button>
          </div>
        ) : (
          <>
            <FlowGroup title="Primary roles (job roles)" flows={primary} {...{ openId, setOpenId, busy, aiDraft, toggleActive, remove, saveSteps }} />
            <FlowGroup title="Secondary roles (specialisms)" flows={secondary} {...{ openId, setOpenId, busy, aiDraft, toggleActive, remove, saveSteps }} />
          </>
        )}
      </div>
    </PlatformShell>
  )
}

function FlowGroup({ title, flows, openId, setOpenId, busy, aiDraft, toggleActive, remove, saveSteps }: {
  title: string
  flows: OnboardingTemplate[]
  openId: string | null
  setOpenId: (id: string | null) => void
  busy: string | null
  aiDraft: (f: OnboardingTemplate) => void
  toggleActive: (f: OnboardingTemplate) => void
  remove: (f: OnboardingTemplate) => void
  saveSteps: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string) => void
}) {
  if (flows.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-mid">{title}</h2>
      <div className="space-y-2">
        {flows.map(f => (
          <FlowCard key={f.id} flow={f} open={openId === f.id} onToggleOpen={() => setOpenId(openId === f.id ? null : f.id)}
            busy={busy === f.id} onAiDraft={() => aiDraft(f)} onToggleActive={() => toggleActive(f)} onRemove={() => remove(f)} onSave={saveSteps} />
        ))}
      </div>
    </div>
  )
}

function FlowCard({ flow, open, onToggleOpen, busy, onAiDraft, onToggleActive, onRemove, onSave }: {
  flow: OnboardingTemplate
  open: boolean
  onToggleOpen: () => void
  busy: boolean
  onAiDraft: () => void
  onToggleActive: () => void
  onRemove: () => void
  onSave: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string) => void
}) {
  const reads = flow.steps.filter(s => s.type === 'read_policy').length
  const ques  = flow.steps.filter(s => s.type === 'answer_question').length

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={onToggleOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {open ? <ChevronUp size={15} className="shrink-0 text-neutral-mid" /> : <ChevronDown size={15} className="shrink-0 text-neutral-mid" />}
          <span className="truncate text-sm font-medium text-neutral-dark">{flow.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${flow.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-neutral-mid'}`}>
            {flow.is_active ? 'Active' : 'Draft'}
          </span>
          <span className="shrink-0 text-xs text-neutral-mid">{reads} read · {ques} questions</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onAiDraft} disabled={busy} title="Draft steps with AI"
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI draft
          </button>
          <button onClick={onToggleActive} disabled={busy} title={flow.is_active ? 'Deactivate' : 'Activate'}
            className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-teal hover:text-teal disabled:opacity-50">
            <Power size={13} />
          </button>
          <button onClick={onRemove} disabled={busy} title="Delete"
            className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-red-300 hover:text-red-600 disabled:opacity-50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {open && <StepEditor flow={flow} busy={busy} onSave={onSave} />}
    </div>
  )
}

function StepEditor({ flow, busy, onSave }: {
  flow: OnboardingTemplate
  busy: boolean
  onSave: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string) => void
}) {
  const [name, setName]               = useState(flow.name)
  const [description, setDescription] = useState(flow.description ?? '')
  const [steps, setSteps]             = useState<OnboardingTemplateStep[]>(flow.steps.map(s => ({ ...s })))

  function setStep(i: number, patch: Partial<OnboardingTemplateStep>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function addStep(type: 'read_policy' | 'answer_question') {
    setSteps(prev => [...prev, {
      order: prev.length, title: type === 'read_policy' ? 'Read the policy' : '', type,
      policy_section: SECTIONS[0], question: type === 'answer_question' ? '' : null,
      options: type === 'answer_question' ? ['', '', '', ''] : [], correct_option: type === 'answer_question' ? 0 : null,
    }])
  }
  function removeStep(i: number) { setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx }))) }

  return (
    <div className="space-y-4 border-t border-gray-100 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Description (optional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="space-y-3">
        {steps.length === 0 && <p className="rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-mid">No steps yet — use “AI draft” above, or add steps below.</p>}
        {steps.map((s, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-dark">
                {s.type === 'read_policy' ? <BookOpen size={13} className="text-teal" /> : <HelpCircle size={13} className="text-amber-brand" />}
                {s.type === 'read_policy' ? 'Read policy' : 'Question'} · step {i + 1}
              </span>
              <button onClick={() => removeStep(i)} className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
            </div>
            <div className="grid gap-2">
              <select value={s.policy_section ?? ''} onChange={e => setStep(i, { policy_section: e.target.value })} className={INPUT}>
                <option value="">— policy section —</option>
                {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
              {s.type === 'read_policy' ? (
                <input value={s.title} onChange={e => setStep(i, { title: e.target.value })} placeholder="Step title" className={INPUT} />
              ) : (
                <>
                  <textarea value={s.question ?? ''} onChange={e => setStep(i, { question: e.target.value, title: e.target.value.slice(0, 200) })} placeholder="Question text" rows={2} className={INPUT} />
                  {(s.options ?? ['', '', '', '']).map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={s.correct_option === oi} onChange={() => setStep(i, { correct_option: oi })} className="text-teal" />
                      <input value={opt} onChange={e => setStep(i, { options: (s.options ?? ['', '', '', '']).map((o, idx) => idx === oi ? e.target.value : o) })}
                        placeholder={`Option ${oi + 1}${s.correct_option === oi ? ' (correct)' : ''}`} className={INPUT} />
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => addStep('read_policy')} className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
          <BookOpen size={12} /> Add read step
        </button>
        <button onClick={() => addStep('answer_question')} className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
          <HelpCircle size={12} /> Add question
        </button>
        <div className="flex-1" />
        <button onClick={() => onSave(flow, steps.map((s, i) => ({ ...s, order: i })), name, description)} disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
        </button>
      </div>
    </div>
  )
}
