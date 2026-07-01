'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type OnboardingTemplate, type OnboardingTemplateStep } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Trash2, Sparkles, Check, ChevronDown, ChevronUp, BookOpen, HelpCircle, Power, Lock, LockOpen } from 'lucide-react'

// Standard policy sections (mirrors api DEFAULT_POLICY_SECTIONS) for the step dropdowns.
const SECTIONS = [
  'Activities', 'Admission management', 'Business procedures', 'Care and health of residents',
  'Complaints and compliments', 'Emergency planning', 'Fees and funding', 'GDPR', 'Governance',
  'Home Premises', 'Infection control', 'Quality Assurance', 'Safeguarding', 'Staff', 'Training',
]

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

// Canonical care-setting values — must match apps/api/src/lib/care-setting.ts
// (CARE_SETTINGS). Previously these used legacy values (nursing_home, care_home…)
// that never matched the stored care_setting (nursing-homes…), so no flows showed.
const SETTINGS: { value: string; label: string }[] = [
  { value: '',                      label: 'All settings' },
  { value: 'residential-care',      label: 'Residential Care' },
  { value: 'nursing-homes',         label: 'Nursing Homes' },
  { value: 'domiciliary-care',      label: 'Domiciliary Care' },
  { value: 'live-in-care',          label: 'Live-in Care' },
  { value: 'complex-care',          label: 'Complex Care' },
  { value: 'shared-lives',          label: 'Shared Lives' },
  { value: 'substance-misuse',      label: 'Substance Misuse & Rehab' },
  { value: 'hospices',              label: 'Hospices' },
  { value: 'independent-hospitals', label: 'Independent Hospitals' },
  { value: 'gp-practices',          label: 'GP & Primary Care' },
  { value: 'dental-practices',      label: 'Dental Practices' },
]
const settingLabel = (v: string | null) => v ? (SETTINGS.find(s => s.value === v)?.label ?? v) : 'All settings'

const DIFFICULTIES: { value: string; label: string }[] = [
  { value: 'very_easy', label: 'Very easy' },
  { value: 'easy',      label: 'Easy' },
  { value: 'medium',    label: 'Medium' },
  { value: 'hard',      label: 'Hard' },
]

export default function OnboardingFlowsPage() {
  const token = usePlatformAuth()
  const [flows,   setFlows]   = useState<OnboardingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState<string | null>(null)   // flowId currently mutating
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [settingTab, setSettingTab] = useState('nursing-homes')

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
      await createPlatformClient(token).onboardingTemplates.seedRoles(settingTab || undefined)
      load()
    } catch (e: any) { setError(e.message) } finally { setSeeding(false) }
  }

  async function aiDraft(f: OnboardingTemplate, keep?: OnboardingTemplateStep[]) {
    if (!token) return
    setBusy(f.id); setError('')
    try {
      const { flow } = await createPlatformClient(token).onboardingTemplates.aiDraft(f.id, keep)
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

  async function saveSteps(f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string, careSetting: string, difficulties: string[]) {
    if (!token) return
    setBusy(f.id)
    try {
      const { flow } = await createPlatformClient(token).onboardingTemplates.update(f.id, { name, description, care_setting: careSetting || null, difficulties, steps })
      replaceFlow(flow)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  const tabFlows  = flows.filter(f => (f.care_setting ?? '') === settingTab)
  const primary   = tabFlows.filter(f => f.flow_kind === 'primary')
  const secondary = tabFlows.filter(f => f.flow_kind === 'secondary')
  const tabCount  = (v: string) => flows.filter(f => (f.care_setting ?? '') === v).length

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
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create role templates{settingTab ? ` (${settingLabel(settingTab)})` : ''}
          </button>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Care-setting tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {SETTINGS.map(s => (
            <button key={s.value} onClick={() => setSettingTab(s.value)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${settingTab === s.value ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}>
              {s.label} <span className="text-xs text-neutral-mid">({tabCount(s.value)})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : tabFlows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-neutral-mid">No {settingLabel(settingTab).toLowerCase()} templates yet.</p>
            <button onClick={seedRoles} disabled={seeding} className="mt-3 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              Create the standard role templates for {settingLabel(settingTab)}
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
  aiDraft: (f: OnboardingTemplate, keep?: OnboardingTemplateStep[]) => void
  toggleActive: (f: OnboardingTemplate) => void
  remove: (f: OnboardingTemplate) => void
  saveSteps: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string, careSetting: string, difficulties: string[]) => void
}) {
  if (flows.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-mid">{title}</h2>
      <div className="space-y-2">
        {flows.map(f => (
          <FlowCard key={f.id} flow={f} open={openId === f.id} onToggleOpen={() => setOpenId(openId === f.id ? null : f.id)}
            busy={busy === f.id} onAiDraft={() => aiDraft(f)} onRegenerate={(keep) => aiDraft(f, keep)} onToggleActive={() => toggleActive(f)} onRemove={() => remove(f)} onSave={saveSteps} />
        ))}
      </div>
    </div>
  )
}

function FlowCard({ flow, open, onToggleOpen, busy, onAiDraft, onRegenerate, onToggleActive, onRemove, onSave }: {
  flow: OnboardingTemplate
  open: boolean
  onToggleOpen: () => void
  busy: boolean
  onAiDraft: () => void
  onRegenerate: (keep: OnboardingTemplateStep[]) => void
  onToggleActive: () => void
  onRemove: () => void
  onSave: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string, careSetting: string, difficulties: string[]) => void
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
          <span className="shrink-0 rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold text-teal">{settingLabel(flow.care_setting)}</span>
          {flow.difficulties.length > 0 && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {flow.difficulties.map(d => DIFFICULTIES.find(x => x.value === d)?.label ?? d).join(', ')}
            </span>
          )}
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
      {/* key on the step-set so the editor remounts (re-reads state) after an AI draft / save */}
      {open && <StepEditor key={flow.steps.map(s => s.id ?? '').join('|') || 'empty'} flow={flow} busy={busy} onSave={onSave} onRegenerate={onRegenerate} />}
    </div>
  )
}

function StepEditor({ flow, busy, onSave, onRegenerate }: {
  flow: OnboardingTemplate
  busy: boolean
  onSave: (f: OnboardingTemplate, steps: OnboardingTemplateStep[], name: string, description: string, careSetting: string, difficulties: string[]) => void
  onRegenerate: (keep: OnboardingTemplateStep[]) => void
}) {
  const [name, setName]               = useState(flow.name)
  const [description, setDescription] = useState(flow.description ?? '')
  const [careSetting, setCareSetting] = useState(flow.care_setting ?? '')
  const [difficulties, setDifficulties] = useState<string[]>(flow.difficulties ?? [])
  const toggleDifficulty = (v: string) => setDifficulties(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const [steps, setSteps]             = useState<OnboardingTemplateStep[]>(flow.steps.map(s => ({ ...s })))

  function setStep(i: number, patch: Partial<OnboardingTemplateStep>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  // Keep/lock a question (and its preceding policy-read step) so it survives a re-generate.
  function toggleKeep(i: number) {
    setSteps(prev => prev.map((s, idx) => {
      if (idx === i) return { ...s, locked: !s.locked }
      if (idx === i - 1 && s.type === 'read_policy') return { ...s, locked: !prev[i].locked }
      return s
    }))
  }
  function regenerate() {
    onRegenerate(steps.filter(s => s.locked).map((s, i) => ({ ...s, order: i })))
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
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Care setting</label>
          <select value={careSetting} onChange={e => setCareSetting(e.target.value)} className={INPUT}>
            {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-neutral-mid">AI draft grounds in this setting&rsquo;s policies; only tenants of this setting (or all) can adopt it.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Question difficulty</label>
          <div className="flex flex-wrap gap-3">
            {DIFFICULTIES.map(d => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm text-neutral-dark">
                <input type="checkbox" checked={difficulties.includes(d.value)} onChange={() => toggleDifficulty(d.value)} className="text-teal" />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-neutral-mid">Pitch AI-drafted questions to these levels — e.g. tick only <em>Very easy</em> for a Kitchen Porter, <em>Hard</em> for a Nurse. Leave blank for a balanced mix. <strong>Save, then AI draft, to apply.</strong></p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.length === 0 && <p className="rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-mid">No steps yet — use “AI draft” above, or add steps below.</p>}
        {steps.map((s, i) => (
          <div key={i} className={`rounded-lg border p-3 ${s.locked ? 'border-teal/40 bg-teal-light/10' : 'border-gray-200'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-dark">
                {s.type === 'read_policy' ? <BookOpen size={13} className="text-teal" /> : <HelpCircle size={13} className="text-amber-brand" />}
                {s.type === 'read_policy' ? 'Read policy' : 'Question'} · step {i + 1}
                {s.locked && <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] font-bold text-teal">KEPT</span>}
              </span>
              <div className="flex items-center gap-1">
                {s.type === 'answer_question' && (
                  <button onClick={() => toggleKeep(i)} title={s.locked ? 'Kept — re-generate won’t change it' : 'Keep this question through re-generate'}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${s.locked ? 'bg-teal text-white' : 'text-neutral-mid hover:bg-gray-100'}`}>
                    {s.locked ? <Lock size={11} /> : <LockOpen size={11} />}{s.locked ? 'Kept' : 'Keep'}
                  </button>
                )}
                <button onClick={() => removeStep(i)} className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
              </div>
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
        <button onClick={regenerate} disabled={busy} title="Re-draft the questions you haven't kept"
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Re-generate questions
        </button>
        <button onClick={() => onSave(flow, steps.map((s, i) => ({ ...s, order: i })), name, description, careSetting, difficulties)} disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
        </button>
      </div>
      <p className="mt-2 text-[11px] text-neutral-mid">“Re-generate” re-draws only the questions you haven’t marked <strong>Keep</strong>. Use the difficulty + setting above to steer it.</p>
    </div>
  )
}
