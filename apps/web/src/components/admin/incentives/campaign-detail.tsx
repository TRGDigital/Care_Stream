'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Download, Gift, Info, X } from 'lucide-react'
import { createIncentivesClient, type IncentiveCampaignDetail, type IncentiveClaim } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { btnPrimary, btnSecondary, btnDangerOutline, ErrorBox, errMsg } from '@/components/admin/residents/ui'
import { CampaignStatusChip, ClaimChip, ConfirmDialog, Initials, ProgressBar, Section, StatTile, fmtDay, fmtWhen, monthLabel, pounds } from './shared'

function banner(c: IncentiveCampaignDetail): { cls: string; text: string } {
  switch (c.status) {
    case 'draft': return { cls: 'border-gray-200 bg-gray-50 text-neutral-dark', text: 'This is a draft. Submit it when you are ready and a care manager will be asked to approve it.' }
    case 'awaiting_approval': return { cls: 'border-amber-200 bg-amber-50 text-amber-800', text: 'Waiting for a care manager to approve.' }
    case 'live': return { cls: 'border-green-200 bg-green-50 text-green-800', text: `Live until the end of the month (${fmtDay(c.period_end)}).` }
    case 'ended': return { cls: 'border-blue-200 bg-blue-50 text-blue-800', text: 'This incentive has ended. Mark approved rewards as given once you have handed them over.' }
    case 'rejected': return { cls: 'border-red-200 bg-red-50 text-red-800', text: `Rejected: ${c.rejected_reason || 'no reason given'}. Edit it and submit it again.` }
    case 'cancelled': return { cls: 'border-gray-200 bg-gray-50 text-neutral-mid', text: 'This incentive was cancelled.' }
  }
}

export function CampaignDetail({ id, token, eventLabels, onClose, onEdit, onChanged }: {
  id: string
  token: string
  eventLabels: Record<string, string>
  onClose: () => void
  onEdit: (c: IncentiveCampaignDetail) => void
  onChanged: () => void          // tells the list to reload
}) {
  const { data: session } = useSession()
  const uk = session?.user?.email ?? 'guest'
  const q = useCachedQuery(`admin-incentive-${uk}-${id}`, () => createIncentivesClient(token).get(id))
  const [confirm, setConfirm] = useState<null | 'submit' | 'cancel' | 'delete'>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [givingId, setGivingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-nested-dialog]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const api = createIncentivesClient(token)
  const d = q.data
  const c = d?.campaign

  async function afterAction() { await q.reload(); onChanged() }

  async function markGiven(claim: IncentiveClaim) {
    setGivingId(claim.id); setActionError(null)
    try { await api.markGiven(claim.id); await afterAction() }
    catch (e) { setActionError(errMsg(e)) }
    finally { setGivingId(null) }
  }

  async function downloadCsv() {
    setExporting(true); setActionError(null)
    try {
      const { filename, text } = await api.exportCsv(id)
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url; a.download = filename || 'incentive-payouts.csv'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setActionError(errMsg(e)) }
    finally { setExporting(false) }
  }

  const rewardTitle = (key: string) => c?.rewards.find(r => r.key === key)?.title ?? key
  const editable = c && (c.status === 'draft' || c.status === 'rejected')
  const cancellable = c && (c.status === 'awaiting_approval' || c.status === 'live')
  const totalValue = c ? (d!.claims.filter(x => x.status === 'approved' || x.status === 'given').reduce((n, x) => n + (x.value_pence ?? 0), 0)) : 0

  // Summary figures, worked out from what the API already returns.
  const totalPoints = d ? d.progress.reduce((n, p) => n + p.points, 0) : 0
  const earners = d ? d.progress.filter(p => p.points > 0).length : 0
  const reached = d ? d.claims.filter(x => ['held', 'approved', 'given'].includes(x.status)).length : 0
  const given = d ? d.claims.filter(x => x.status === 'given').length : 0
  const waiting = d ? d.claims.filter(x => x.status === 'held').length : 0
  const placesTaken = (key: string) => d ? d.claims.filter(x => x.reward_key === key && ['held', 'approved', 'given'].includes(x.status)).length : 0
  const b = c ? banner(c) : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-light" role="dialog" aria-modal="true" aria-label="Incentive details">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div ref={topRef} tabIndex={-1} className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 focus:outline-none sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="break-words text-xl font-bold text-neutral-dark sm:text-2xl">{c?.name ?? 'Incentive'}</h2>
              {c && <CampaignStatusChip status={c.status} />}
            </div>
            {c && <p className="mt-0.5 text-sm text-neutral-mid">{monthLabel(c.month)}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {c && editable && <button type="button" className={btnSecondary} onClick={() => onEdit(c)}>Edit</button>}
            {c && editable && <button type="button" className={btnPrimary} onClick={() => setConfirm('submit')}>Submit for approval</button>}
            {c && cancellable && <button type="button" className={btnDangerOutline} onClick={() => setConfirm('cancel')}>Cancel incentive</button>}
            {c && c.status === 'draft' && <button type="button" className={btnDangerOutline} onClick={() => setConfirm('delete')}>Delete</button>}
            {c && <button type="button" className={btnSecondary} onClick={downloadCsv} disabled={exporting}><Download size={14} /> {exporting ? 'Preparing...' : 'Download CSV'}</button>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-neutral-mid hover:bg-gray-100"><X size={20} /></button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {q.loading && !d && <p className="py-10 text-center text-sm text-neutral-mid" role="status">Loading...</p>}
        {q.error && !d && <ErrorBox>{q.error}</ErrorBox>}

        {d && c && b && (
          <div className="space-y-6">
            <div className={`flex items-start gap-3 rounded-card border px-5 py-4 text-sm leading-relaxed ${b.cls}`} role="status">
              <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{b.text}</p>
                <p className="mt-1 opacity-80">
                  {c.everyone ? 'Applies to all current staff (agency staff excluded).' : `Applies to ${c.participants_count} chosen staff.`}
                  {c.created_by_name ? ` Created by ${c.created_by_name}.` : ''}
                  {c.approved_by_name ? ` Approved by ${c.approved_by_name}${c.approved_at ? ` on ${fmtWhen(c.approved_at)}` : ''}.` : ''}
                </p>
              </div>
            </div>
            {q.error && <ErrorBox>{q.error}</ErrorBox>}
            {actionError && <ErrorBox>{actionError}</ErrorBox>}

            {(c.status === 'live' || c.status === 'ended') && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Points earned" value={totalPoints} hint={`${earners} of ${d.progress.length} people`} />
                <StatTile label="Rewards reached" value={reached} />
                <StatTile label="Waiting for a care manager" value={waiting} tone={waiting > 0 ? 'warn' : 'plain'} />
                <StatTile label="Given" value={given} tone={given > 0 ? 'good' : 'plain'} hint={totalValue > 0 ? `${pounds(totalValue)} approved or given` : undefined} />
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Section title="Rewards">
                  <ul className="space-y-3">
                    {c.rewards.map(r => {
                      const taken = placesTaken(r.key)
                      return (
                        <li key={r.key} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                          {r.image_data
                            ? <img src={r.image_data} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 bg-white object-contain p-1" />
                            : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal/10"><Gift size={22} className="text-teal" /></span>}
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-base font-semibold text-neutral-dark">{r.title}</p>
                            <p className="mt-0.5 text-sm text-neutral-mid">
                              {r.quantity != null ? `${r.quantity} ${r.quantity === 1 ? 'place' : 'places'}, earliest completion time first` : 'Everyone who reaches it'}
                              {r.value_pence != null ? `. Worth ${pounds(r.value_pence)} each` : ''}
                            </p>
                            {(c.status === 'live' || c.status === 'ended') && (
                              <p className="mt-1 text-xs font-medium text-neutral-mid">{r.quantity != null ? `${taken} of ${r.quantity} places taken` : `${taken} ${taken === 1 ? 'person has' : 'people have'} reached it`}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-2xl font-bold leading-none text-teal">{r.target_points}</p>
                            <p className="mt-1 text-xs text-neutral-mid">points needed</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              </div>
              <div className="lg:col-span-2">
                <Section title="How points are earned">
                  <ul className="divide-y divide-gray-100">
                    {c.rules.map((r, i) => (
                      <li key={r.id ?? i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-dark">{eventLabels[r.event] ?? r.event}</p>
                          {r.max_per_month != null && <p className="text-xs text-neutral-mid">Up to {r.max_per_month} times each</p>}
                        </div>
                        <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-sm font-bold text-teal">+{r.points}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            </div>

            <Section title="Progress" hint={d.progress.length > 0 ? 'Everyone in this incentive, most points first.' : undefined}>
              {d.progress.length === 0 ? <p className="text-sm text-neutral-mid">Points show here once the incentive is live.</p> : (
                <ul className="divide-y divide-gray-100">
                  {d.progress.map(p => (
                    <li key={p.user_id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:gap-6">
                      <div className="flex min-w-0 items-center gap-3 md:w-64 md:shrink-0">
                        <Initials name={p.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-dark">{p.name}</p>
                          {p.job_role && <p className="truncate text-xs text-neutral-mid">{p.job_role}</p>}
                        </div>
                        <p className="shrink-0 text-right"><span className="text-xl font-bold text-neutral-dark">{p.points}</span><span className="ml-1 text-xs text-neutral-mid">pts</span></p>
                      </div>
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        {c.rewards.map(r => {
                          const x = p.rewards.find(y => y.key === r.key)
                          if (!x) return null
                          return (
                            <div key={r.key} className="min-w-0">
                              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                                <span className="truncate font-medium text-neutral-dark">{r.title}</span>
                                <span className="shrink-0 text-neutral-mid">{Math.min(p.points, x.target)} of {x.target}</span>
                              </div>
                              <ProgressBar pct={x.pct} done={!!x.claim && x.claim !== 'missed'} label={`${p.name}, ${r.title}`} />
                              {x.claim && <div className="mt-1.5"><ClaimChip status={x.claim} /></div>}
                            </div>
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Payouts" hint="Rewards people have reached. A care manager approves each one, then someone marks it as given. Check with your payroll provider if a reward is paid through pay.">
              {d.claims.length === 0 ? <p className="text-sm text-neutral-mid">Nobody has reached a reward yet.</p> : (
                <ul className="space-y-3">
                  {d.claims.map(cl => (
                    <li key={cl.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Initials name={cl.user_name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-dark">{cl.user_name}</p>
                          <p className="truncate text-sm text-neutral-mid">{cl.reward_title || rewardTitle(cl.reward_key)}{cl.rank != null ? `, place ${cl.rank}` : ''}</p>
                          <p className="mt-0.5 text-xs text-neutral-mid">
                            Reached {fmtWhen(cl.reached_at)}
                            {cl.decided_by_name ? `. Approved by ${cl.decided_by_name}` : ''}
                            {cl.given_by_name ? `. Given by ${cl.given_by_name}${cl.given_at ? `, ${fmtWhen(cl.given_at)}` : ''}` : ''}
                          </p>
                          {cl.status === 'rejected' && cl.reject_reason && <p className="mt-1 text-xs text-neutral-mid">{cl.reject_reason}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <ClaimChip status={cl.status} />
                        {cl.tied && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <AlertTriangle size={12} aria-hidden="true" /> Same time as the next person, the care manager decides
                          </span>
                        )}
                        {cl.status === 'approved' && (
                          <button type="button" className={btnPrimary} disabled={givingId === cl.id} onClick={() => markGiven(cl)}>{givingId === cl.id ? 'Saving...' : 'Mark as given'}</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </div>

      {confirm === 'submit' && c && (
        <ConfirmDialog title="Submit for approval" confirmLabel="Submit" onClose={() => setConfirm(null)}
          body="A care manager is emailed and must approve this incentive before it goes live."
          onConfirm={async () => { await api.submit(id); await afterAction() }} />
      )}
      {confirm === 'cancel' && c && (
        <ConfirmDialog title="Cancel this incentive" confirmLabel="Cancel incentive" danger onClose={() => setConfirm(null)}
          body="Staff stop earning points and the incentive is closed. Points already earned stay on record. This cannot be undone."
          onConfirm={async () => { await api.cancel(id); await afterAction() }} />
      )}
      {confirm === 'delete' && c && (
        <ConfirmDialog title="Delete this draft" confirmLabel="Delete" danger onClose={() => setConfirm(null)}
          body="This draft is removed for good."
          onConfirm={async () => { await api.remove(id); onChanged(); onClose() }} />
      )}
    </div>
  )
}
