'use client'

// Staff incentives (Professional and Enterprise): admins build monthly campaigns, a care manager approves them,
// staff earn points from recorded training events. CareStream records and reports only.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Check, Gift, Lock, Plus } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { createIncentivesClient, type IncentiveCampaignDetail, type IncentiveCampaignSummary } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { CampaignBuilder, type StaffOption } from '@/components/admin/incentives/campaign-builder'
import { CampaignDetail } from '@/components/admin/incentives/campaign-detail'
import { CampaignStatusChip, monthLabel } from '@/components/admin/incentives/shared'
import { btnPrimary, ErrorBox } from '@/components/admin/residents/ui'

type View = null | { mode: 'detail'; id: string } | { mode: 'builder'; existing: IncentiveCampaignDetail | null }

function UpgradePanel() {
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-6 shadow-card sm:p-8">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"><Lock size={18} className="text-amber-600" /></div>
        <div>
          <h2 className="text-lg font-bold text-neutral-dark">Staff incentives</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Professional and Enterprise</p>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-neutral-mid">Run a monthly incentive so your team engages with training. Staff earn points for things CareStream records, and reaching a target unlocks a reward you choose.</p>
      <ul className="mb-6 space-y-2 text-sm text-neutral-dark">
        {['Points for completing training, on time, CPD courses, onboarding and practical sign-off', 'A care manager approves each incentive and each reward payout', 'Limited places go to whoever reaches the target first', 'CareStream records and reports only. It never buys vouchers or moves money'].map(b => (
          <li key={b} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-teal" />{b}</li>
        ))}
      </ul>
      <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline">See plans <ArrowRight size={14} /></Link>
    </div>
  )
}

export default function IncentivesPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const uk = session?.user?.email ?? 'guest'
  const [view, setView] = useState<View>(null)

  const meta = useCachedQuery(token ? `admin-incentives-meta-${uk}` : null, () => createIncentivesClient(token).meta())
  const enabled = meta.data?.enabled === true
  const planBlocked = meta.data?.enabled === false
  const list = useCachedQuery(enabled ? `admin-incentives-list-${uk}` : null, () => createIncentivesClient(token).campaigns())
  const staffQ = useCachedQuery(enabled ? `admin-incentives-staff-${uk}` : null, async (): Promise<StaffOption[]> => {
    const res: any = await createApiClient(token).users.list()
    const rows: any[] = Array.isArray(res) ? res : (res?.users ?? [])
    return rows
      .filter(u => u.is_active !== false && !u.is_agency)
      .map(u => ({ id: u.id as string, name: (u.name ?? u.email ?? 'Unnamed') as string, job_role: (u.job_role ?? null) as string | null }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const eventLabels = useMemo(() => Object.fromEntries((meta.data?.events ?? []).map(e => [e.key, e.label])), [meta.data])

  const groups = useMemo(() => {
    const byMonth = new Map<string, IncentiveCampaignSummary[]>()
    for (const c of list.data?.campaigns ?? []) byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c])
    return Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [list.data])

  if (!token || (meta.loading && !meta.data)) return <p className="py-10 text-center text-sm text-neutral-mid" role="status">Loading...</p>
  if (planBlocked || (meta.error && (meta.error.toLowerCase().includes('plan') || meta.error.includes('FEATURE_NOT_AVAILABLE')))) return <UpgradePanel />
  if (!meta.data) return <ErrorBox>{meta.error ?? 'Could not load incentives.'}</ErrorBox>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-dark">Staff incentives</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-mid">Run a monthly incentive. Staff earn points from what CareStream records, and reaching a target unlocks a reward. A care manager approves each incentive and each payout.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setView({ mode: 'builder', existing: null })}><Plus size={16} /> New incentive</button>
      </div>

      {list.loading && !list.data && <p className="py-8 text-center text-sm text-neutral-mid" role="status">Loading incentives...</p>}
      {list.error && <ErrorBox>{list.error}</ErrorBox>}

      {list.data && groups.length === 0 && (
        <div className="rounded-card border border-dashed border-gray-300 bg-white p-8 text-center">
          <Gift size={28} className="mx-auto text-teal" />
          <p className="mt-2 text-sm font-semibold text-neutral-dark">No incentives yet</p>
          <p className="mt-1 text-sm text-neutral-mid">Create your first one to encourage your team to finish training this month.</p>
        </div>
      )}

      {groups.map(([month, items]) => (
        <section key={month} aria-label={monthLabel(month)}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-mid">{monthLabel(month)}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => setView({ mode: 'detail', id: c.id })} className="block w-full rounded-card border border-gray-200 bg-white p-4 text-left shadow-card hover:border-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold text-neutral-dark">{c.name}</p>
                    <CampaignStatusChip status={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-mid">{monthLabel(c.month)}</p>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[
                      ['People', c.everyone && c.participants_count === 0 ? 'All' : c.participants_count],
                      ['Rewards', c.rewards_count],
                      ['Waiting', c.claims.held],
                      ['Given', c.claims.given],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg bg-neutral-light px-1 py-2">
                        <dd className="text-base font-bold text-neutral-dark">{value}</dd>
                        <dt className="text-[11px] text-neutral-mid">{label}</dt>
                      </div>
                    ))}
                  </dl>
                  {c.approved_by_name && <p className="mt-2 text-xs text-neutral-mid">Approved by {c.approved_by_name}</p>}
                  {c.status === 'rejected' && c.rejected_reason && <p className="mt-2 text-xs text-red-700">Rejected: {c.rejected_reason}</p>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {view?.mode === 'detail' && (
        <CampaignDetail
          key={view.id}
          id={view.id}
          token={token}
          eventLabels={eventLabels}
          onClose={() => setView(null)}
          onEdit={c => setView({ mode: 'builder', existing: c })}
          onChanged={() => { list.reload() }}
        />
      )}
      {view?.mode === 'builder' && (
        <CampaignBuilder
          token={token}
          events={meta.data.events}
          maxImageBytes={meta.data.max_image_bytes}
          staff={staffQ.data ?? []}
          staffLoading={staffQ.loading}
          existing={view.existing}
          onClose={() => setView(view.existing ? { mode: 'detail', id: view.existing.id } : null)}
          onSaved={id => { list.reload(); setView({ mode: 'detail', id }) }}
        />
      )}
    </div>
  )
}
