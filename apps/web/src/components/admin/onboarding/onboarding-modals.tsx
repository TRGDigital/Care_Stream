'use client'

// Onboarding modals — extracted from the onboarding page and lazy-loaded
// (next/dynamic) so this code is only fetched when a flow form, progress
// panel or enroll dialog is opened.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Users, CheckCircle2, Clock, AlertCircle, AlertTriangle, X, GripVertical, Plus, Sparkles, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Step, Flow } from './onboarding-shared'

// ─── Policy typeahead (for "read policy" steps) ───────────────────────────────

type PolicyLite = { id: string; name: string; document_category?: string; status?: string }

// A searchable picker: the tenant types a policy name, sees their uploaded
// policies filtered live, and selects one — which stores the policy's real id
// in the step's policy_id while showing the readable name.
function PolicyPicker({ policies, loading, value, onChange }: {
  policies: PolicyLite[]
  loading: boolean
  value?: string
  onChange: (id: string) => void
}) {
  const selected = policies.find(p => p.id === value)
  const [query, setQuery] = useState(selected?.name ?? value ?? '')
  const [open,  setOpen]  = useState(false)

  const q = query.trim().toLowerCase()
  const matches = (q
    ? policies.filter(p => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q))
    : policies
  ).slice(0, 8)

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value.trim()) onChange('') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={loading ? 'Loading your policies…' : 'Start typing a policy name to link it (optional)'}
        className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-neutral-mid focus:border-teal focus:outline-none" />
      {open && !loading && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(p.id); setQuery(p.name); setOpen(false) }}
              className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-neutral-light"
            >
              <span className="text-xs font-medium text-neutral-dark">{p.name}</span>
              {p.document_category && (
                <span className="text-[10px] capitalize text-neutral-mid">{p.document_category.replace(/_/g, ' ')}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && !loading && q && matches.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-neutral-mid shadow-lg">
          No matching policy. Upload it on the Policies page first.
        </div>
      )}
      {selected
        ? <p className="mt-1 text-[11px] text-teal">Linked to &ldquo;{selected.name}&rdquo;</p>
        : <p className="mt-1 text-[11px] text-neutral-mid">Optional. Links this step to a specific uploaded policy.</p>}
    </div>
  )
}

// ─── Flow Form ────────────────────────────────────────────────────────────────

export function FlowForm({ api, initial, onClose, onSaved }: {
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
    initial?.steps.map((s: any) => ({ title: s.title, type: s.type, policy_id: s.policy_id, policy_section: s.policy_section, question: s.question, options: s.options ?? [], correct_option: s.correct_option ?? 0 })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  // The tenant's uploaded policies, for the "read policy" step typeahead.
  const [policies,        setPolicies]        = useState<PolicyLite[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(true)
  useEffect(() => {
    let alive = true
    api.policies.list({ limit: '2000' })
      .then((d: any) => {
        if (!alive) return
        const list: PolicyLite[] = (d?.policies ?? []).filter((p: any) => !p.status || p.status === 'active')
        setPolicies(list)
      })
      .catch(() => {})
      .finally(() => { if (alive) setPoliciesLoading(false) })
    return () => { alive = false }
  }, [api])

  function addStep(type: 'read_policy' | 'answer_question') {
    setSteps(prev => [...prev, type === 'answer_question'
      ? { title: '', type, question: '', options: ['', '', '', ''], correct_option: 0 }
      : { title: '', type, policy_id: '' }])
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  // Policies already linked in this flow's "read policy" steps — the AI can
  // generate knowledge-check questions from any of them.
  const linkedPolicies = [...new Set(steps.filter(s => s.type === 'read_policy' && s.policy_id).map(s => s.policy_id as string))]
    .map(id => ({ id, name: policies.find(p => p.id === id)?.name ?? 'Linked policy' }))

  const hasQuestions = steps.some(s => s.type === 'answer_question')

  const [genPolicy, setGenPolicy] = useState('')
  const [genCount,  setGenCount]  = useState(3)
  const [genBusy,   setGenBusy]   = useState(false)

  function titleFromQuestion(q: string): string {
    const t = q.trim()
    return t.length > 70 ? t.slice(0, 67) + '…' : t
  }

  // Generate knowledge-check questions from a linked policy. When replace is
  // true (re-generate), all existing question steps are swapped for a fresh set
  // in one go; otherwise the generated questions are appended after the steps.
  async function generateQuestionsFromPolicy(policyId: string, count: number, replace: boolean) {
    if (!policyId || genBusy) return
    setGenBusy(true); setErr('')
    try {
      const { questions } = await api.onboarding.generateQuestions(policyId, count)
      if (!questions?.length) { setErr('No questions were generated. Please try again.'); return }
      const generated: Step[] = questions.map(q => ({
        title:          titleFromQuestion(q.question),
        type:           'answer_question',
        policy_id:      policyId,   // source: the policy these questions were generated from
        question:       q.question,
        options:        q.options,
        correct_option: q.correct_option,
      }))
      setSteps(prev => replace
        ? [...prev.filter(s => s.type !== 'answer_question'), ...generated]
        : [...prev, ...generated])
    } catch (e: any) {
      setErr(e?.message ?? 'Could not generate questions. Please try again.')
    } finally {
      setGenBusy(false)
    }
  }

  async function save() {
    if (!name.trim()) { setErr('Flow name is required'); return }
    if (steps.some(s => s.type === 'answer_question' && !s.question?.trim())) { setErr('Question steps need a question'); return }
    if (steps.some(s => s.type !== 'answer_question' && !s.title.trim())) { setErr('All steps need a title'); return }
    setSaving(true)
    setErr('')
    try {
      // A question step with all 4 options filled is treated as auto-marked MCQ;
      // otherwise it's a free-text question (options cleared). Question steps have
      // no title field of their own, so derive one from the question text.
      const normalizedSteps = steps.map(s => {
        if (s.type !== 'answer_question') return s
        const title = s.title?.trim() || titleFromQuestion(s.question ?? '')
        const opts = s.options ?? []
        const mcq = opts.length === 4 && opts.every(o => o.trim())
        return mcq
          ? { ...s, title, options: opts.map(o => o.trim()), correct_option: Math.min(Math.max(s.correct_option ?? 0, 0), 3) }
          : { ...s, title, options: [], correct_option: null }
      })
      const payload = { name: name.trim(), description: description.trim() || undefined, job_roles: jobRoles, steps: normalizedSteps }
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
                  {step.type === 'read_policy' && (
                    <>
                      <input value={step.title} onChange={e => updateStep(i, { title: e.target.value })}
                        placeholder="Step title (e.g. Read Medication Policy)"
                        className="mb-2 w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      <PolicyPicker
                        policies={policies}
                        loading={policiesLoading}
                        value={step.policy_id}
                        onChange={id => updateStep(i, { policy_id: id })}
                      />
                    </>
                  )}
                  {step.type === 'answer_question' && (
                    <div className="space-y-2">
                      <textarea value={step.question ?? ''} onChange={e => updateStep(i, { question: e.target.value, title: e.target.value.slice(0, 120) })}
                        placeholder="The question staff must answer"
                        rows={2}
                        className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      <p className="text-[11px] text-neutral-mid">Fill all four options for an auto-marked multiple-choice question, or leave them blank for a free-text answer.</p>
                      {[0, 1, 2, 3].map(oi => (
                        <label key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`correct-${i}`} checked={(step.correct_option ?? 0) === oi}
                            onChange={() => updateStep(i, { correct_option: oi })} className="text-teal" title="Correct answer" />
                          <input value={step.options?.[oi] ?? ''}
                            onChange={e => updateStep(i, { options: [0,1,2,3].map(k => k === oi ? e.target.value : (step.options?.[k] ?? '')) })}
                            placeholder={`Option ${oi + 1}${(step.correct_option ?? 0) === oi ? ' (correct)' : ''}`}
                            className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                        </label>
                      ))}
                    </div>
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

            {/* AI question generation from a policy linked in a "read policy" step */}
            {linkedPolicies.length > 0 ? (
              <div className="mt-4 rounded-lg border border-teal/30 bg-teal/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-teal">
                    <Sparkles size={13} /> {hasQuestions ? 'Re-generate questions from policy' : 'Generate questions from policy'}
                  </span>
                  {linkedPolicies.length > 1 && (
                    <select value={genPolicy || linkedPolicies[0].id} onChange={e => setGenPolicy(e.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-teal focus:outline-none">
                      {linkedPolicies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  <select value={genCount} onChange={e => setGenCount(Number(e.target.value))}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-teal focus:outline-none">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} question{n > 1 ? 's' : ''}</option>)}
                  </select>
                  <button type="button" disabled={genBusy}
                    onClick={() => generateQuestionsFromPolicy(genPolicy || linkedPolicies[0].id, genCount, hasQuestions)}
                    className="inline-flex items-center gap-1 rounded bg-teal px-3 py-1 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                    {genBusy
                      ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                      : <><Sparkles size={13} /> {hasQuestions ? 'Re-generate with AI' : 'Generate with AI'}</>}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  {linkedPolicies.length === 1 ? <>Based on &ldquo;{linkedPolicies[0].name}&rdquo;. </> : null}
                  AI reads the policy and writes the questions, each with four options and the correct answer marked.
                  {hasQuestions ? ' Re-generating replaces all current question steps in one go.' : ' They are added as question steps you can then edit.'}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-neutral-mid">
                Tip: add a <strong>Read policy</strong> step above and link a policy, then generate knowledge-check questions from it with AI.
              </p>
            )}
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

// ─── Flow Preview ─────────────────────────────────────────────────────────────
// A read-only view of a flow as staff experience it — each policy to read and each
// question (with its answers and where it came from). Tenants can delete a step
// they don't want (e.g. an irrelevant generated question) right here.

// Lets a tenant admin tell us whether a ready-made (CareStream-sourced) question is
// relevant/good. Feeds the platform template review so questions improve over time.
function QuestionFeedback({ api, flowId, stepId, question }: {
  api: ReturnType<typeof createApiClient>
  flowId?: string
  stepId?: string
  question: string
}) {
  const [mode, setMode] = useState<'idle' | 'reason' | 'done'>('idle')
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')

  async function send(rating: 'good' | 'not_relevant' | 'not_good') {
    setBusy(true)
    try {
      await api.onboarding.questionFeedback({ flow_id: flowId, step_id: stepId, question, rating, comment: comment.trim() || undefined })
      setMode('done')
    } catch { /* leave the control so they can retry */ }
    finally { setBusy(false) }
  }

  if (mode === 'done') return <p className="mt-2 text-[11px] font-medium text-teal">✓ Thanks, your feedback helps CareStream improve our generation systems.</p>

  return (
    <div className="mt-2">
      {mode === 'idle' ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-mid">
          <span>Is this question relevant to the role?</span>
          <button onClick={() => send('good')} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 font-medium hover:border-green-300 hover:text-green-600 disabled:opacity-50"><ThumbsUp size={11} /> Yes</button>
          <button onClick={() => setMode('reason')} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 font-medium hover:border-amber-300 hover:text-amber-700 disabled:opacity-50"><ThumbsDown size={11} /> No</button>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-neutral-dark">What&rsquo;s the issue? (optional comment below)</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button onClick={() => send('not_relevant')} disabled={busy} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-dark hover:border-amber-300 disabled:opacity-50">Not relevant to the role</button>
            <button onClick={() => send('not_good')} disabled={busy} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-dark hover:border-amber-300 disabled:opacity-50">Not a good question</button>
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Optional: tell us more…" className="w-full rounded border border-gray-200 px-2 py-1 text-[11px] focus:border-teal focus:outline-none" />
          <div className="mt-1 flex items-center justify-end gap-2">
            {busy && <Loader2 size={11} className="animate-spin text-neutral-mid" />}
            <button onClick={() => { setMode('idle'); setComment('') }} className="text-[11px] text-neutral-mid hover:text-neutral-dark">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function FlowPreview({ api, flow, onClose, onChanged }: {
  api: ReturnType<typeof createApiClient>
  flow: Flow
  onClose: () => void
  onChanged: (flow: Flow) => void
}) {
  const [steps, setSteps]       = useState<Array<Step & { id?: string; order?: number }>>(() => [...(flow.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
  const [policies, setPolicies] = useState<PolicyLite[]>([])
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.policies.list({ limit: '2000' })
      .then((d: any) => setPolicies((d?.policies ?? []).map((p: any) => ({ id: p.id, name: p.name, document_category: p.document_category, status: p.status }))))
      .catch(() => {})
  }, [api])

  const policyName = (id?: string | null) => (id ? policies.find(p => p.id === id)?.name : undefined)
  // Ready-made flows are adopted from a CareStream role template: their questions
  // are written in CareStream's backend (saving the tenant AI costs), then matched
  // to the tenant's own policies to read. So questions in these flows are sourced
  // from "CareStream Sources", not the tenant's policies. A tenant's own flow shows
  // the tenant policy each question was generated from.
  const isReadyMade = !!flow.source_flow_id

  async function deleteStep(index: number) {
    setSaving(true); setErr('')
    const remaining = steps.filter((_, i) => i !== index)
    try {
      const payload = remaining.map(s => ({ title: s.title, type: s.type, policy_id: s.policy_id, policy_section: s.policy_section ?? null, question: s.question, options: s.options ?? [], correct_option: s.correct_option ?? 0 }))
      const { flow: updated } = await api.onboarding.updateFlow(flow.id, { steps: payload })
      const safe = { ...flow, ...updated, steps: updated?.steps ?? [] } as Flow
      setSteps([...(safe.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
      setConfirmDel(null)
      onChanged(safe)
    } catch (e: any) { setErr(e?.message ?? 'Could not delete the step.') }
    finally { setSaving(false) }
  }

  let qNum = 0
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-dark">{flow.name}</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">Preview of what staff work through, {steps.length} step{steps.length !== 1 ? 's' : ''}. Remove any step that isn&rsquo;t relevant.</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        {err && <p className="mx-6 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
          {steps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-neutral-mid">This flow has no steps.</p>
          ) : steps.map((s, i) => {
            const isQ = s.type === 'answer_question'
            if (isQ) qNum++
            const srcName = policyName(s.policy_id)
            return (
              <div key={s.id ?? i} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${isQ ? 'bg-blue-50 text-blue-700' : 'bg-teal-light/40 text-teal'}`}>
                    {isQ ? <><Sparkles size={11} /> Question {qNum}</> : <><CheckCircle2 size={11} /> Read a policy</>}
                  </span>
                  {confirmDel === i ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-neutral-mid">Delete this?</span>
                      <button onClick={() => deleteStep(i)} disabled={saving} className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 font-medium text-white hover:bg-red-600 disabled:opacity-50">{saving ? <Loader2 size={11} className="animate-spin" /> : null} Delete</button>
                      <button onClick={() => setConfirmDel(null)} className="rounded px-1.5 py-0.5 text-neutral-mid hover:text-neutral-dark">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDel(i)} title="Remove this step from the flow" className="shrink-0 rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-500"><X size={14} /></button>
                  )}
                </div>

                {isQ ? (
                  <>
                    <p className="text-sm font-medium text-neutral-dark">{s.question || s.title}</p>
                    {Array.isArray(s.options) && s.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {s.options.map((opt, oi) => (
                          <li key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${oi === s.correct_option ? 'border-green-300 bg-green-50 text-neutral-dark' : 'border-gray-200 text-neutral-dark'}`}>
                            {oi === s.correct_option ? <CheckCircle2 size={13} className="shrink-0 text-green-500" /> : <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-300" />}
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] text-neutral-mid">
                      <span className="font-medium text-neutral-dark">Source: </span>
                      {isReadyMade
                        ? <span className="font-medium text-teal">CareStream Sources</span>
                        : srcName
                          ? <>Generated from <span className="text-neutral-dark">{srcName}</span></>
                          : s.policy_id
                            ? 'Source policy no longer available'
                            : 'Source not recorded'}
                    </p>
                    {isReadyMade && (
                      <QuestionFeedback api={api} flowId={flow.id} stepId={s.id} question={s.question || s.title} />
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-neutral-dark">{s.title}</p>
                    <p className="mt-1 text-[11px] text-neutral-mid">
                      {srcName
                        ? <><span className="font-medium text-neutral-dark">Reads: </span>{srcName}</>
                        : <span className="text-amber-700">Not linked to a policy yet</span>}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Done</button>
        </div>
      </div>
    </div>
  )
}

// ─── Progress Panel ───────────────────────────────────────────────────────────

export function ProgressPanel({ api, flow, onClose }: {
  api: ReturnType<typeof createApiClient>
  flow: Flow
  onClose: () => void
}) {
  const [data,    setData]    = useState<{ flow: any; enrollments: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [enrollModal, setEnrollModal] = useState(false)

  // A flow can't be sent to staff while any 'read policy' step has no policy linked —
  // they'd have nothing to read. Block enrolment until it's mapped/uploaded.
  const unmappedReads = (flow.steps as any[]).filter((s: any) => s.type === 'read_policy' && !s.policy_id).length
  const notReady = unmappedReads > 0

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
            disabled={notReady}
            title={notReady ? `${unmappedReads} 'read policy' step${unmappedReads !== 1 ? 's' : ''} need a policy linked before you can enrol staff. Use Edit to map them, or upload the policy.` : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Users size={12} /> Enroll staff
          </button>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
        </div>
      </div>

      <div className="px-6 py-4">
        {notReady && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <span>This flow isn&apos;t ready to send: <strong>{unmappedReads} &lsquo;read policy&rsquo; step{unmappedReads !== 1 ? 's' : ''}</strong> {unmappedReads !== 1 ? "aren't" : "isn't"} linked to one of your policies. Click <strong>Edit</strong> to map {unmappedReads !== 1 ? 'them' : 'it'} to a policy (or upload the policy first), then enrol staff.</span>
          </div>
        )}
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
