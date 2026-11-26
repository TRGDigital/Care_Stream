'use client'

// Under the "Wording to add" box: other people named in the wording who are not current role holders (usually copied from a policy that is out of date), with a choice for each:
// keep the name, or replace every occurrence with a current person. Archived staff are found automatically; "Check for other names" asks the AI to look for anyone else.
import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import type { AdoptPerson } from '@/components/admin/adopt-named-people'

export type FoundName = { name: string; kind: 'archived' | 'unknown'; job_role: string | null; occurrences: number }
export type Choice = { key: string; role: string; name: string }

const sameName = (a: string, b: string) => a.replace(/,/g, '').toLowerCase().trim() === b.replace(/,/g, '').toLowerCase().trim()

export function AdoptOtherNames({ found, kept, choices, allChoices, people, checking, aiRan, error, onCheckAi, onReplace, onKeep }: {
  found: FoundName[]
  kept: Set<string>
  choices: Choice[]
  allChoices: Choice[]
  people: AdoptPerson[]
  checking: boolean
  aiRan: boolean
  error: string
  onCheckAi: () => void
  onReplace: (from: string, to: string, role: string) => void
  onKeep: (name: string) => void
}) {
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})
  const open = found.filter(f => !kept.has(f.name))
  const keptNow = found.filter(f => kept.has(f.name))
  const personFor = (n: string) => people.find(p => sameName(p.name, n) && p.is_active !== false) ?? people.find(p => sameName(p.name, n)) ?? null

  return (
    <div className="mt-3">
      {open.map(f => {
        // Someone who held a manager role is most likely replaced by whoever holds it now, so those are offered first.
        const preferred = f.job_role && /manager/i.test(f.job_role) ? allChoices.filter(c => c.key === 'registered_manager') : []
        const base = showAll[f.name] ? allChoices : choices
        const list = [...preferred, ...base.filter(c => !preferred.some(p => p.name === c.name))].filter((c, i, a) => a.findIndex(x => x.name === c.name) === i && !sameName(c.name, f.name)).slice(0, showAll[f.name] ? 30 : 4)
        return (
          <div key={f.name} className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              Another name is in this wording: <strong>{f.name}</strong>
              {f.kind === 'archived' ? <> (archived{f.job_role ? `, was ${f.job_role}` : ''})</> : <> (not in your staff list or your organisation details)</>}
              {' '}&middot; {f.occurrences} {f.occurrences === 1 ? 'time' : 'times'}.
            </p>
            <p className="mt-0.5 text-xs text-amber-900">It may be out of date. Keep it as it is, or replace every one with a current person.</p>
            {list.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {list.map(c => {
                  const person = personFor(c.name)
                  return (
                    <li key={`${c.key}-${c.name}`}>
                      <button type="button" onClick={() => onReplace(f.name, c.name, c.role)}
                        className="inline-flex items-center gap-1.5 rounded-btn border border-teal/40 bg-white py-1 pl-1.5 pr-2.5 text-xs font-medium text-teal hover:bg-teal-light/30">
                        {person && <StaffAvatar name={person.name} photoUrl={person.photo_url ?? null} size={20} />}
                        Replace with {c.name} <span className="font-normal text-neutral-mid">&middot; {c.role}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => onKeep(f.name)} className="rounded-btn border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark hover:border-gray-300">Keep {f.name} as it is</button>
              {allChoices.length > choices.length && (
                <button type="button" onClick={() => setShowAll(s => ({ ...s, [f.name]: !s[f.name] }))} className="text-xs text-neutral-mid underline-offset-2 hover:text-neutral-dark hover:underline">{showAll[f.name] ? 'Show only the relevant people' : 'Show everyone'}</button>
              )}
            </div>
          </div>
        )
      })}
      {keptNow.length > 0 && <p className="mb-1 text-xs text-neutral-mid">Keeping {keptNow.map(k => k.name).join(', ')} as written.</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-mid">
        <button type="button" onClick={onCheckAi} disabled={checking}
          title="Looks for anyone named in this wording who is not in your staff list. Uses one AI credit."
          className="inline-flex items-center gap-1.5 font-medium text-teal hover:underline disabled:opacity-50">
          {checking ? <><Loader2 size={12} className="animate-spin" /> Checking…</> : <><Search size={12} /> {aiRan ? 'Check for other names again' : 'Check for other names'}</>}
        </button>
        {aiRan && !checking && open.length === 0 && keptNow.length === 0 && !error && <span>No other names found.</span>}
        {error && <span className="text-amber-700">{error}</span>}
      </div>
    </div>
  )
}
