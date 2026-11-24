'use client'

// A small summary of funding for the Residents screen: totals worked out in code, no names and no individual figures. LOCKED, administrators only.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { funding, pounds, type FundingSummary } from '@/lib/funding-client'
import { LockedBadge } from '@/components/admin/locked-badge'

export function FundingSummaryCard({ token }: { token: string }) {
  const [s, setS] = useState<FundingSummary | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { let live = true; funding.summary(token).then(r => { if (live) setS(r) }).catch(e => { if (live) setError(e?.message ?? 'Could not load.') }); return () => { live = false } }, [token])
  if (error) return null
  if (!s) return <p className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-mid"><Loader2 size={12} className="animate-spin" /> Loading funding summary</p>
  if (s.people === 0) return <div className="mx-3 mb-2 rounded-xl border border-gray-200 bg-white p-3 text-xs text-neutral-mid"><LockedBadge className="mb-1.5" /><p>No funding details have been added yet. Open a person and choose Funding.</p></div>
  return (
    <section className="mx-3 mb-2 space-y-2 rounded-xl border border-gray-200 bg-white p-3 text-sm" aria-label="Funding summary">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-neutral-dark">Funding summary</h3><LockedBadge /></div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-neutral-light/60 px-2 py-1.5"><p className="text-[11px] text-neutral-mid">Income a week</p><p className="font-bold text-neutral-dark">{pounds(s.weekly_income)}</p></div>
        <div className="rounded-lg bg-neutral-light/60 px-2 py-1.5"><p className="text-[11px] text-neutral-mid">People recorded</p><p className="font-bold text-neutral-dark">{s.people}{s.without_funding > 0 ? <span className="text-xs font-normal text-neutral-mid"> ({s.without_funding} to add)</span> : ''}</p></div>
        <div className="rounded-lg bg-neutral-light/60 px-2 py-1.5"><p className="text-[11px] text-neutral-mid">Reviews in 30 days</p><p className="font-bold text-neutral-dark">{s.review_due_30_days}</p></div>
      </div>
      <ul className="space-y-0.5 text-xs text-neutral-dark">{s.by_type.map(t => <li key={t.funding_type} className="flex justify-between gap-2"><span>{t.label}</span><span className="text-neutral-mid">{t.count} ({t.percent}%){t.average_weekly != null ? `, average ${pounds(t.average_weekly)} a week` : ''}</span></li>)}</ul>
      {s.estimates_included && <p className="text-[11px] text-neutral-mid">Includes estimates for hourly care.</p>}
    </section>
  )
}
