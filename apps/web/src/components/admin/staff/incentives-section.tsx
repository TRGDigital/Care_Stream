'use client'

// Staff record: points and rewards history, per month. Admin only information. Hidden when the plan does not include
// incentives (403), the call fails, or the person has no points history.
import { useState } from 'react'
import { createIncentivesClient, type StaffPointsMonth } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { ChevronDown, Trophy } from 'lucide-react'

const monthName = (m: string) => {
  const d = new Date(`${m}-01T00:00:00`)
  return isNaN(d.getTime()) ? m : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const CLAIM: Record<string, string> = {
  held: 'Reached, waiting for approval', approved: 'Approved', given: 'Given', missed: 'Missed (places gone)', rejected: 'Rejected', forfeited: 'Forfeited',
}

export function StaffIncentivesSection({ token, userId, viewerKey, firstName }: { token: string; userId: string; viewerKey: string; firstName: string }) {
  const q = useCachedQuery<{ months: StaffPointsMonth[]; hidden?: boolean }>(
    token ? `admin-staff-incentives-${viewerKey}-${userId}` : null,
    () => createIncentivesClient(token).staffHistory(userId).catch((e: any) => {
      if (e?.status === 403) return { months: [], hidden: true }   // plan without incentives, or not allowed: hide
      throw e
    }),
  )
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const months = q.data?.months ?? []
  if (q.data?.hidden || (!q.data && !q.loading)) return null
  if (q.loading && !q.data) return null

  return (
    <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Trophy size={15} className="text-teal" /> Incentives</p>
      <p className="mb-3 text-xs text-neutral-mid">Points {firstName} has earned in monthly incentive campaigns, and the rewards they were working towards.</p>
      {months.length === 0 && <p className="rounded-lg bg-neutral-light/40 px-3 py-3 text-sm text-neutral-mid">{firstName} is not in an incentive yet. When one is live, this month's position and every past month will show here.</p>}
      <div className="space-y-2">
        {months.map((m, i) => {
          const isOpen = open[m.month] ?? i === 0
          const total = m.campaigns.reduce((s, c) => s + c.points, 0)
          return (
            <div key={m.month} className="rounded-lg border border-gray-100">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [m.month]: !isOpen }))}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-light/40">
                <span className="text-sm font-medium text-neutral-dark">{monthName(m.month)}{m.campaigns.some(c => c.status === 'live') && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">This month</span>}</span>
                <span className="flex items-center gap-2 text-xs text-neutral-mid">{total} {total === 1 ? 'point' : 'points'}<ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
              </button>
              {isOpen && (
                <div className="space-y-4 border-t border-gray-100 px-3 py-3">
                  {m.campaigns.map(c => (
                    <div key={c.id}>
                      <p className="text-sm font-semibold text-neutral-dark">{c.name} <span className="font-normal text-neutral-mid">· {c.points} {c.points === 1 ? 'point' : 'points'}</span></p>
                      {c.rewards.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {c.rewards.map((r, ri) => (
                            <li key={ri} className="text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="min-w-0 break-words text-neutral-dark">{r.title} <span className="text-xs text-neutral-mid">({Math.min(c.points, r.target)} of {r.target} points)</span></span>
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-mid">{r.claim ? CLAIM[r.claim] ?? r.claim : c.status === 'live' ? 'In progress' : 'Not reached'}</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={Math.min(100, Math.round((c.points / r.target) * 100))} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.title} progress`}>
                                <div className={`h-full rounded-full ${r.claim && r.claim !== 'missed' ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${Math.min(100, Math.round((c.points / r.target) * 100))}%` }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {c.entries.length > 0 && (
                        <ul className="mt-2 divide-y divide-gray-50 rounded-md bg-neutral-light/20 px-2">
                          {c.entries.map((e, ei) => (
                            <li key={ei} className="flex items-start justify-between gap-3 py-1.5">
                              <div className="min-w-0"><p className="break-words text-sm text-neutral-dark">{e.label}</p><p className="text-xs text-neutral-mid">{dateLabel(e.at)}</p></div>
                              <span className="shrink-0 text-sm font-semibold text-teal">{e.points > 0 ? '+' : ''}{e.points}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
