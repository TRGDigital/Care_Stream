'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Info, Loader2, Sparkles, Users } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { DOMAINS, type Domain, type StaffUser } from './cqc-shared'

// Hover explainer for the option dropdowns. Same pattern as the gaps page's
// StepInfoDot; `wide` fits the standard-set tooltip, which lists four themes.
function InfoDot({ wide, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <span className="group relative ml-1 inline-flex shrink-0 align-middle">
      <Info size={13} className="cursor-help text-neutral-mid/50 group-hover:text-teal" />
      <span className={`pointer-events-none absolute left-1/2 bottom-full z-30 mb-1.5 hidden ${wide ? 'w-96' : 'w-72'} -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left text-[11px] font-normal normal-case leading-relaxed text-neutral-dark shadow-lg group-hover:block`}>
        {children}
      </span>
    </span>
  )
}

// Role-matched CQC prep: pick WHO first, then the AI generates questions that fit
// each person's job (chef → food safety, nurse → medicines…) plus a small core
// set everyone must be able to answer, and sends them in one step.
export function RoleBasedSend({ staff, token, onSent }: { staff: StaffUser[]; token: string; onSent: () => void }) {
  const [open, setOpen]         = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [perRole, setPerRole]   = useState(3)
  const [domains, setDomains]   = useState<Set<Domain>>(new Set(DOMAINS.map(d => d.key)))
  const [core, setCore]         = useState(2)
  const [standard, setStandard] = useState(4)   // the 4 standard CQC inspector themes
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState<{ delivered: number; roles: Array<{ role: string; recipients: number; questions: number }>; core_questions: number; standard_questions: number; credits_used: number } | null>(null)

  // Group staff by job role — the whole point of the flow.
  const groups = useMemo(() => {
    const map = new Map<string, StaffUser[]>()
    for (const s of staff) {
      const role = (s.job_role ?? '').trim() || 'General care staff'
      if (!map.has(role)) map.set(role, [])
      map.get(role)!.push(s)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [staff])

  const selectedRoles = useMemo(() => {
    const roles = new Set<string>()
    for (const [role, members] of groups) if (members.some(m => selected.has(m.id))) roles.add(role)
    return roles
  }, [groups, selected])

  const creditEstimate = selectedRoles.size * perRole + (selected.size > 0 ? core + standard : 0)

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleGroup(members: StaffUser[]) {
    setSelected(prev => {
      const next = new Set(prev)
      const allIn = members.every(m => next.has(m.id))
      members.forEach(m => (allIn ? next.delete(m.id) : next.add(m.id)))
      return next
    })
  }
  function selectAll() {
    setSelected(prev => (prev.size === staff.length ? new Set() : new Set(staff.map(s => s.id))))
  }

  async function send() {
    if (selected.size === 0) return
    setSending(true); setError(''); setResult(null)
    try {
      const res = await createApiClient(token).cqcQuestions.generateForStaff({
        user_ids: Array.from(selected), per_role: perRole, core, standard,
        domains: domains.size === DOMAINS.length ? undefined : Array.from(domains),
      })
      setResult(res)
      setSelected(new Set())
      onSent()
    } catch (e: any) {
      setError(e.message ?? 'Generation failed — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    // No overflow-hidden on the card: the InfoDot tooltips must be able to escape it.
    <div className="mb-6 rounded-card border border-teal/30 bg-white shadow-card">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-teal" />
          <span className="text-sm font-semibold text-neutral-dark">Send role-matched questions</span>
          <span className="rounded-full bg-teal-light px-2 py-0.5 text-[11px] font-semibold text-teal">Recommended</span>
        </span>
        <ChevronDown size={15} className={`text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-4 text-sm text-neutral-mid">
            Pick who should practise, and the AI generates questions matched to each person&rsquo;s job — the chef gets
            food safety and allergens, nurses get medicines and clinical care — plus a small core set (safeguarding,
            whistleblowing, fire) that every member of staff should be able to answer, and the <strong>standard CQC
            question set</strong>: the four themes inspectors raise with staff in almost every inspection (what you enjoy
            about your role, raising concerns, day-to-day support, and the support you receive) — reworded freshly every
            time so staff practise the substance, not a script. Questions are generated fresh, saved to your bank, and
            sent in one step.
          </p>

          {/* Staff picker, grouped by role */}
          <div className="mb-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <button onClick={selectAll} className="text-xs font-semibold text-teal hover:underline">
              {selected.size === staff.length ? 'Clear all' : `Select everyone (${staff.length})`}
            </button>
            {groups.map(([role, members]) => {
              const allIn = members.every(m => selected.has(m.id))
              return (
                <div key={role}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={allIn} onChange={() => toggleGroup(members)} className="h-4 w-4 accent-[#9B52B5]" />
                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-dark">{role}</span>
                    <span className="text-[11px] text-neutral-mid">({members.length})</span>
                  </label>
                  <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {members.map(m => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-1.5 text-sm text-neutral-dark">
                        <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="h-3.5 w-3.5 accent-[#9B52B5]" />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Domain scope */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-neutral-dark">CQC domains to draw questions from</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDomains(prev => (prev.size === DOMAINS.length ? new Set() : new Set(DOMAINS.map(d => d.key))))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  domains.size === DOMAINS.length ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-mid hover:border-teal hover:text-teal'
                }`}
              >
                All 5 domains
              </button>
              {DOMAINS.map(d => {
                const on = domains.has(d.key)
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDomains(prev => { const next = new Set(prev); next.has(d.key) ? next.delete(d.key) : next.add(d.key); return next })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on ? `${d.bg} ${d.color} border-current` : 'border-gray-200 text-neutral-mid hover:text-neutral-dark'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
            {domains.size === 0 && <p className="mt-1 text-xs text-red-600">Pick at least one domain.</p>}
          </div>

          {/* Options */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <label className="text-xs font-medium text-neutral-dark">
              Role-specific questions each
              <InfoDot>
                How many tailored questions each <span className="font-semibold">job role</span> receives, generated to fit that role&rsquo;s day-to-day work: the chef gets food safety and allergens, nurses get medicines and clinical care. Everyone in the same role receives the same set, so colleagues can practise together.
              </InfoDot>
              <select value={perRole} onChange={e => setPerRole(Number(e.target.value))} className="ml-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-neutral-dark">
              Core questions for everyone
              <InfoDot>
                How many questions <span className="font-semibold">every selected member of staff</span> receives regardless of their role, drawn from the topics all staff must be able to answer in an inspection: safeguarding, whistleblowing and fire safety. Set to 0 to skip them.
              </InfoDot>
              <select value={core} onChange={e => setCore(Number(e.target.value))} className="ml-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-neutral-dark">
              Standard CQC question set
              <InfoDot wide>
                <span className="mb-1.5 block">The four themes CQC inspectors raise with staff in almost every inspection, reworded freshly each time they are sent so staff practise the substance, not a script:</span>
                <span className="block space-y-1.5">
                  <span className="block"><span className="font-semibold">1. What you enjoy about your role.</span> Inspectors want to hear what you love about working at the service and how your work has made a positive difference to people&rsquo;s lives. If there is something you are particularly proud of, share the story: inspectors value real examples of meaningful impact.</span>
                  <span className="block"><span className="font-semibold">2. Your experience of raising concerns.</span> If you have ever raised a concern about the quality of care, inspectors want to understand what happened next. Were you listened to? What actions were taken? The need for improvement does not automatically mean a service is poor, and inspectors look at how issues are raised and how the provider responds.</span>
                  <span className="block"><span className="font-semibold">3. How you support people day-to-day.</span> Inspectors want to know about the people you care for, how you understand and meet their needs, and how the service shares information within the team to achieve the best outcomes for those you support.</span>
                  <span className="block"><span className="font-semibold">4. The support you get in your role.</span> Inspectors want to know that you are supported by your line managers, that you know where to go when you need help, and that you have had the training and support you need in your role.</span>
                </span>
              </InfoDot>
              <select value={standard} onChange={e => setStandard(Number(e.target.value))} className="ml-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n === 4 ? 'All 4' : n}</option>)}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-3">
              {selected.size > 0 && (
                <span className="text-xs text-neutral-mid">
                  {selected.size} staff · {selectedRoles.size} role{selectedRoles.size === 1 ? '' : 's'} · ~{creditEstimate} AI credit{creditEstimate === 1 ? '' : 's'}
                </span>
              )}
              <button
                onClick={send}
                disabled={sending || selected.size === 0 || domains.size === 0}
                className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                {sending ? 'Generating & sending…' : 'Generate & send'}
              </button>
            </div>
          </div>
          {sending && (
            <p className="mb-2 text-xs text-neutral-mid">
              Generating tailored questions for each role — this can take a minute or two for several roles. Please keep this page open.
            </p>
          )}
          {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={14} /> {result.delivered} questions sent ({result.credits_used} AI credits)</p>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {result.roles.map(r => (
                  <li key={r.role}>{r.role}: {r.questions} tailored question{r.questions === 1 ? '' : 's'} → {r.recipients} staff</li>
                ))}
                {result.core_questions > 0 && <li>Core (all selected staff): {result.core_questions} question{result.core_questions === 1 ? '' : 's'}</li>}
                {result.standard_questions > 0 && <li>Standard CQC set (all selected staff): {result.standard_questions} question{result.standard_questions === 1 ? '' : 's'}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
