'use client'

// Staff incentives (Professional and Enterprise): admins build monthly campaigns, a care manager approves them,
// staff earn points from recorded training events. CareStream records and reports only.

import { useMemo, useState } from 'react'
import { useSearchIntent } from '@/lib/admin-search/intents'
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

const ACCENT: Record<IncentiveCampaignSummary['status'], string> = {
  draft: 'bg-gray-300', awaiting_approval: 'bg-amber-400', live: 'bg-green-500', ended: 'bg-blue-400', rejected: 'bg-red-400', cancelled: 'bg-gray-200',
}

function nextStep(c: IncentiveCampaignSummary): string {
  switch (c.status) {
    case 'draft': return 'Draft. Submit it when you are ready.'
    case 'awaiting_approval': return 'Waiting for a care manager to approve.'
    case 'live': return c.claims.held > 0 ? `${c.claims.held} reward${c.claims.held === 1 ? '' : 's'} waiting for a care manager.` : (c.approved_by_name ? `Approved by ${c.approved_by_name}.` : 'Live now.')
    case 'ended': return c.claims.given > 0 ? `${c.claims.given} reward${c.claims.given === 1 ? '' : 's'} given.` : 'Ended.'
    case 'rejected': return `Needs changes: ${c.rejected_reason || 'no reason given'}`
    case 'cancelled': return 'Cancelled.'
  }
}

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
  useSearchIntent({ 'new-incentive': () => setView({ mode: 'builder', existing: null }) })

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
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal/10"><Gift size={24} className="text-teal" /></div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark">Staff incentives</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-mid">Staff earn points from what CareStream records, and reaching a target unlocks a reward. A care manager approves each incentive and each payout.</p>
          </div>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setView({ mode: 'builder', existing: null })}><Plus size={16} /> New incentive</button>
      </div>

      {list.loading && !list.data && <p className="py-8 text-center text-sm text-neutral-mid" role="status">Loading incentives...</p>}
      {list.error && <ErrorBox>{list.error}</ErrorBox>}

      {list.data && groups.length === 0 && (
        <div className="rounded-card border border-dashed border-gray-300 bg-white p-10 text-center">
          <Gift size={30} className="mx-auto text-teal" />
          <p className="mt-3 text-base font-semibold text-neutral-dark">No incentives yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">Create your first one to encourage your team to finish training this month.</p>
        </div>
      )}

      {groups.map(([month, items]) => (
        <section key={month} aria-label={monthLabel(month)}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-mid">{monthLabel(month)}</h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {items.map(c => {
              const people = c.everyone && c.participants_count === 0 ? 'Everyone' : String(c.participants_count)
              const next = nextStep(c)
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setView({ mode: 'detail', id: c.id })}
                    className="group block w-full overflow-hidden rounded-card border border-gray-200 bg-white text-left shadow-card transition hover:border-teal hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
                    <div className={`h-1.5 w-full ${ACCENT[c.status]}`} aria-hidden="true" />
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-bold leading-snug text-neutral-dark">{c.name}</p>
                          <p className="mt-0.5 text-sm text-neutral-mid">{monthLabel(c.month)}</p>
                        </div>
                        <CampaignStatusChip status={c.status} />
                      </div>

                      {(c.reward_titles?.length ?? 0) > 0 && (
                        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Rewards">
                          {c.reward_titles!.slice(0, 3).map(r => (
                            <li key={r} className="flex max-w-full items-center gap-1.5 rounded-full bg-neutral-light px-3 py-1.5 text-sm text-neutral-dark"><Gift size={13} className="shrink-0 text-teal" /><span className="truncate">{r}</span></li>
                          ))}
                          {c.reward_titles!.length > 3 && <li className="rounded-full bg-neutral-light px-3 py-1.5 text-sm text-neutral-mid">+{c.reward_titles!.length - 3} more</li>}
                        </ul>
                      )}

                      <dl className="mt-5 grid grid-cols-4 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/60">
                        {([['People', people], ['Rewards', c.rewards_count], ['Waiting', c.claims.held], ['Given', c.claims.given]] as const).map(([label, value]) => (
                          <div key={label} className="px-2 py-3 text-center">
                            <dd className={`text-xl font-bold ${label === 'Waiting' && c.claims.held > 0 ? 'text-amber-600' : 'text-neutral-dark'}`}>{value}</dd>
                            <dt className="mt-0.5 text-xs text-neutral-mid">{label}</dt>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                        <p className={`min-w-0 ${c.status === 'rejected' ? 'text-red-700' : 'text-neutral-mid'}`}>{next}</p>
                        <span className="flex shrink-0 items-center gap-1 font-semibold text-teal">Open <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
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
