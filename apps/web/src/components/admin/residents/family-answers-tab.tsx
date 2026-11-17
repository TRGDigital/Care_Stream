'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import type { ResidentContribution, ResidentDetail, ResidentSectionDef } from '@/lib/residents-api'
import { fmtDate } from './ui'

// What family and friends have told you, once approved, grouped under the person who gave it, so an admin can check it
// against the profile. One accordion per person. (The same text is also in the profile, with their name after it.)
export function FamilyAnswersTab({ resident, sections }: { resident: ResidentDetail; sections: ResidentSectionDef[] }) {
  const label = (k: string) => sections.find(s => s.key === k)?.label ?? k
  const order = (k: string) => { const i = sections.findIndex(s => s.key === k); return i < 0 ? 999 : i }

  const approved = resident.contributions.filter(c => c.status === 'approved')
  const rejected = resident.contributions.filter(c => c.status === 'rejected').length
  const groups: Array<{ invite_id: string; name: string; relationship: string; items: ResidentContribution[]; latest: string }> = []
  for (const c of approved) {
    let g = groups.find(x => x.invite_id === c.invite_id)
    if (!g) { g = { invite_id: c.invite_id, name: c.contributor_name, relationship: c.relationship, items: [], latest: c.decided_at ?? c.submitted_at }; groups.push(g) }
    g.items.push(c)
    const when = c.decided_at ?? c.submitted_at
    if (when > g.latest) g.latest = when
  }
  groups.sort((a, b) => b.latest.localeCompare(a.latest))
  for (const g of groups) g.items.sort((a, b) => order(a.section_key) - order(b.section_key))

  const [open, setOpen] = useState<Record<string, boolean>>(() => (groups.length === 1 ? { [groups[0].invite_id]: true } : {}))
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">
        What family and friends have told you about {resident.preferred_name || resident.first_name}, as you approved it, under the name of the person who gave it.
        It is also in the profile, with their name after it.
      </p>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-neutral-mid">
          Nothing has been approved yet. Approved answers appear here, under the name of the person who gave them.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const isOpen = !!open[g.invite_id]
            const panelId = `fa-${g.invite_id}`
            return (
              <section key={g.invite_id} className="rounded-lg border border-gray-200 bg-white">
                <h4>
                  <button type="button" onClick={() => toggle(g.invite_id)} aria-expanded={isOpen} aria-controls={panelId}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-light/60">
                    {isOpen ? <ChevronDown size={16} className="shrink-0 text-neutral-mid" /> : <ChevronRight size={16} className="shrink-0 text-neutral-mid" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-dark">{g.name}</span>
                      <span className="block truncate text-xs text-neutral-mid">{g.relationship}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-neutral-mid">
                      {g.items.length} {g.items.length === 1 ? 'answer' : 'answers'}
                      {fmtDate(g.latest) && <span className="block">approved {fmtDate(g.latest)}</span>}
                    </span>
                  </button>
                </h4>
                {isOpen && (
                  <ul id={panelId} className="divide-y divide-gray-100 border-t border-gray-100">
                    {g.items.map(c => (
                      <li key={c.id} className="space-y-1 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal">{label(c.section_key)}</p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-dark">{c.approved_text ?? c.text}</p>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                          {c.decided_at && <span>Approved {fmtDate(c.decided_at)}{c.decided_by ? ` by ${c.decided_by}` : ''}</span>}
                          {c.approved_text && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800"><Pencil size={11} /> Edited before approving</span>
                          )}
                        </p>
                        {c.approved_text && (
                          <details className="text-xs text-neutral-mid">
                            <summary className="cursor-pointer select-none">See what they wrote</summary>
                            <p className="mt-1 whitespace-pre-line rounded bg-neutral-light/60 p-2">{c.text}</p>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {rejected > 0 && <p className="text-xs text-neutral-mid">{rejected} {rejected === 1 ? 'answer was' : 'answers were'} rejected and is not shown. You can see it under Approvals, in the history.</p>}
    </div>
  )
}
