'use client'

// Under the "Wording to add" box when a suggestion is being adopted: the named people from Organisation details who matter to THIS wording or policy, each with their picture,
// and a button that rewrites the wording once so the name sits in it naturally (instead of pasting it at the cursor). Everyone else is one click away under "Show everyone".
import { useMemo, useState } from 'react'
import { Loader2, Undo2, UserRound } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { relevantRoleKeys } from '@/lib/name-relevance'

export type AdoptPerson = { name: string; photo_url?: string | null; is_active?: boolean }
type Entry = { key: string; role: string; name: string }

/** Every named person in Organisation details with the role they hold (a person who holds two roles appears twice). */
export function namedEntries(roleHolders: Array<{ key: string; role: string; candidates: string[] }>, nominated: string, approver: string): Array<{ key: string; role: string; name: string }> {
  const list: Array<{ key: string; role: string; name: string }> = []
  for (const rh of roleHolders) for (const c of rh.candidates) list.push({ key: rh.key, role: rh.role, name: c })
  if (nominated) list.push({ key: 'nominated_individual', role: 'Nominated individual', name: nominated })
  if (approver) list.push({ key: 'default_approver', role: 'Approver', name: approver })
  const seen = new Set<string>()
  return list.filter(e => { const k = `${e.key}|${e.name.toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true })
}

const sameName = (a: string, b: string) => a.replace(/,/g, '').toLowerCase().trim() === b.replace(/,/g, '').toLowerCase().trim()

export function AdoptNamedPeople({ roleHolders, nominated, approver, people, wording, requirement, policyName, policyText, weaving, canUndo, error, onWeave, onUndo, onRefreshPeople }: {
  roleHolders: Array<{ key: string; role: string; candidates: string[] }>
  nominated: string
  approver: string
  people: AdoptPerson[]
  wording: string
  requirement: string
  policyName: string
  policyText?: string
  weaving: string | null
  canUndo: boolean
  error: string
  onWeave: (name: string, role: string) => void
  onUndo: () => void
  onRefreshPeople?: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const entries = useMemo<Entry[]>(() => namedEntries(roleHolders, nominated, approver), [roleHolders, nominated, approver])
  const relevant = useMemo(() => relevantRoleKeys({ wording: `${wording}\n${requirement}`, policyName, policyText }), [wording, requirement, policyName, policyText])
  const shown = showAll ? entries : entries.filter(e => relevant.has(e.key))
  const hidden = entries.length - entries.filter(e => relevant.has(e.key)).length
  if (entries.length === 0) return null

  const personFor = (n: string) => people.find(p => sameName(p.name, n) && p.is_active !== false) ?? people.find(p => sameName(p.name, n)) ?? null
  const isArchived = (n: string) => people.some(p => sameName(p.name, n) && p.is_active === false) && !people.some(p => sameName(p.name, n) && p.is_active !== false)
  const why = (k: string) => relevant.get(k) === 'wording' ? 'Named in this wording' : relevant.get(k) === 'policy' ? 'Named in this policy' : relevant.get(k) === 'title' ? 'Looks after the subject of this policy' : 'Not obviously linked to this wording or policy'

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-neutral-light/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">{showAll ? 'Everyone named in your organisation details' : 'Named people who matter here'}</p>
        {canUndo && (
          <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-mid hover:text-neutral-dark"><Undo2 size={12} /> Undo the last change</button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-mid">No named person looks relevant to this wording or policy.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {shown.map(e => {
            const person = personFor(e.name)
            const already = wording.toLowerCase().includes(e.name.toLowerCase())
            const busy = weaving === e.name
            return (
              <li key={`${e.key}-${e.name}`} className="flex items-center gap-2.5 rounded-md bg-white px-2.5 py-1.5" title={why(e.key)}>
                {person ? <StaffAvatar name={person.name} photoUrl={person.photo_url ?? null} size={28} onRefresh={onRefreshPeople} /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-neutral-mid"><UserRound size={14} aria-hidden="true" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-dark">{e.name}
                    {isArchived(e.name) && <span title="This person is archived. Choose someone else." className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-amber-900">Archived</span>}
                  </span>
                  <span className="block truncate text-xs text-neutral-mid">{e.role}</span>
                </span>
                <button type="button" onClick={() => onWeave(e.name, e.role)} disabled={!!weaving || already || !wording.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-teal/40 bg-white px-2.5 py-1 text-xs font-medium text-teal hover:bg-teal-light/30 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <><Loader2 size={12} className="animate-spin" /> Working it in…</> : already ? 'Already in the wording' : `Weave in ${e.name.split(' ')[0]}`}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
      {(hidden > 0 || showAll) && (
        <button type="button" onClick={() => setShowAll(s => !s)} className="mt-2 text-xs text-neutral-mid underline-offset-2 hover:text-neutral-dark hover:underline">
          {showAll ? 'Show only the relevant people' : `Show everyone (${hidden} more)`}
        </button>
      )}
    </div>
  )
}
