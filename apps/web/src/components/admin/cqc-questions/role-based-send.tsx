'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Users } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { DOMAINS, type Domain, type StaffUser } from './cqc-shared'

// Role-matched CQC prep: pick WHO first, then the AI generates questions that fit
// each person's job (chef → food safety, nurse → medicines…) plus a small core
// set everyone must be able to answer, and sends them in one step.
export function RoleBasedSend({ staff, token, onSent }: { staff: StaffUser[]; token: string; onSent: () => void }) {
  const [open, setOpen]         = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [perRole, setPerRole]   = useState(3)
  const [domains, setDomains]   = useState<Set<Domain>>(new Set(DOMAINS.map(d => d.key)))
  const [core, setCore]         = useState(2)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState<{ delivered: number; roles: Array<{ role: string; recipients: number; questions: number }>; core_questions: number; credits_used: number } | null>(null)

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

  const creditEstimate = selectedRoles.size * perRole + (selected.size > 0 ? core : 0)

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
        user_ids: Array.from(selected), per_role: perRole, core,
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
    <div className="mb-6 overflow-hidden rounded-card border border-teal/30 bg-white shadow-card">
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
            whistleblowing, fire) that every member of staff should be able to answer. Questions are generated fresh,
            saved to your bank, and sent in one step.
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
              <select value={perRole} onChange={e => setPerRole(Number(e.target.value))} className="ml-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-neutral-dark">
              Core questions for everyone
              <select value={core} onChange={e => setCore(Number(e.target.value))} className="ml-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
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
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
