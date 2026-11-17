'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Download, X } from 'lucide-react'
import { createIncentivesClient, type IncentiveCampaignDetail, type IncentiveClaim } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { btnPrimary, btnSecondary, btnDangerOutline, ErrorBox, errMsg } from '@/components/admin/residents/ui'
import { CampaignStatusChip, ClaimChip, ConfirmDialog, Section, fmtDay, fmtWhen, monthLabel, pounds } from './shared'

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-light" role="dialog" aria-modal="true" aria-label="Incentive details">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
        <div ref={topRef} tabIndex={-1} className="mb-4 flex items-start justify-between gap-3 focus:outline-none">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-neutral-dark">{c?.name ?? 'Incentive'}</h2>
            {c && <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-mid">{monthLabel(c.month)} <CampaignStatusChip status={c.status} /></p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-neutral-mid hover:bg-white"><X size={18} /></button>
        </div>

        {q.loading && !d && <p className="py-10 text-center text-sm text-neutral-mid" role="status">Loading...</p>}
        {q.error && !d && <ErrorBox>{q.error}</ErrorBox>}

        {d && c && (
          <div className="space-y-4">
            <div className={`rounded-card border px-4 py-3 text-sm ${banner(c).cls}`} role="status">{banner(c).text}</div>
            {q.error && <ErrorBox>{q.error}</ErrorBox>}
            {actionError && <ErrorBox>{actionError}</ErrorBox>}

            <div className="flex flex-wrap gap-2">
              {editable && <button type="button" className={btnSecondary} onClick={() => onEdit(c)}>Edit</button>}
              {editable && <button type="button" className={btnPrimary} onClick={() => setConfirm('submit')}>Submit for approval</button>}
              {cancellable && <button type="button" className={btnDangerOutline} onClick={() => setConfirm('cancel')}>Cancel incentive</button>}
              {c.status === 'draft' && <button type="button" className={btnDangerOutline} onClick={() => setConfirm('delete')}>Delete</button>}
              <button type="button" className={`${btnSecondary} sm:ml-auto`} onClick={downloadCsv} disabled={exporting}><Download size={14} /> {exporting ? 'Preparing...' : 'Download CSV'}</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Section title="How points are earned">
                <ul className="space-y-2 text-sm">
                  {c.rules.map((r, i) => (
                    <li key={r.id ?? i} className="flex items-start justify-between gap-3">
                      <span className="text-neutral-dark">{eventLabels[r.event] ?? r.event}</span>
                      <span className="shrink-0 text-right text-neutral-mid"><strong className="text-neutral-dark">{r.points}</strong> points{r.max_per_month != null ? `, up to ${r.max_per_month} times each` : ''}</span>
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Rewards">
                <ul className="space-y-3 text-sm">
                  {c.rewards.map(r => (
                    <li key={r.key} className="flex items-start gap-3">
                      {r.image_data && <img src={r.image_data} alt="" className="h-10 w-10 shrink-0 rounded border border-gray-200 object-contain" />}
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-dark">{r.title}</p>
                        <p className="text-xs text-neutral-mid">
                          {r.target_points} points. {r.quantity != null ? `${r.quantity} ${r.quantity === 1 ? 'place' : 'places'}, earliest completion time first` : 'Everyone who reaches it'}.
                          {r.value_pence != null ? ` Worth ${pounds(r.value_pence)} each.` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {totalValue > 0 && <p className="mt-3 text-xs text-neutral-mid">Approved and given so far: {pounds(totalValue)}</p>}
              </Section>
            </div>

            <p className="text-xs text-neutral-mid">
              {c.everyone ? 'Everyone (all current staff, agency staff excluded).' : `${c.participants_count} chosen staff.`}
              {c.created_by_name ? ` Created by ${c.created_by_name}.` : ''}
              {c.approved_by_name ? ` Approved by ${c.approved_by_name}${c.approved_at ? ` on ${fmtWhen(c.approved_at)}` : ''}.` : ''}
            </p>

            <Section title="Progress">
              {d.progress.length === 0 ? <p className="text-sm text-neutral-mid">Nobody has any points yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="text-xs text-neutral-mid">
                      <tr>
                        <th scope="col" className="py-2 pr-3 font-medium">Person</th>
                        <th scope="col" className="px-3 py-2 font-medium">Points</th>
                        {c.rewards.map(r => <th key={r.key} scope="col" className="px-3 py-2 font-medium">{r.title}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {d.progress.map(p => (
                        <tr key={p.user_id} className="align-top">
                          <th scope="row" className="py-2 pr-3 font-medium text-neutral-dark">{p.name}{p.job_role && <span className="block text-xs font-normal text-neutral-mid">{p.job_role}</span>}</th>
                          <td className="px-3 py-2 font-semibold text-neutral-dark">{p.points}</td>
                          {c.rewards.map(r => {
                            const x = p.rewards.find(y => y.key === r.key)
                            if (!x) return <td key={r.key} className="px-3 py-2 text-neutral-mid">-</td>
                            const pct = Math.max(0, Math.min(100, Math.round(x.pct)))
                            return (
                              <td key={r.key} className="px-3 py-2">
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name}, ${r.title}`}>
                                  <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-neutral-mid">{Math.min(p.points, x.target)} of {x.target}</p>
                                {x.claim && <div className="mt-1"><ClaimChip status={x.claim} /></div>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Payouts">
              {d.claims.length === 0 ? <p className="text-sm text-neutral-mid">Nobody has reached a reward yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="text-xs text-neutral-mid">
                      <tr>
                        {['Person', 'Reward', 'Place', 'Status', 'Reached', 'Approved by', 'Given by', ''].map((h, i) => <th key={i} scope="col" className="px-2 py-2 font-medium first:pl-0">{h || <span className="sr-only">Actions</span>}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {d.claims.map(cl => (
                        <tr key={cl.id} className="align-top">
                          <th scope="row" className="py-2 pr-2 font-medium text-neutral-dark">{cl.user_name}</th>
                          <td className="px-2 py-2">{cl.reward_title || rewardTitle(cl.reward_key)}</td>
                          <td className="px-2 py-2">{cl.rank ?? '-'}</td>
                          <td className="px-2 py-2">
                            <ClaimChip status={cl.status} />
                            {cl.tied && (
                              <span className="mt-1 flex items-start gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> Same time as the next person: the care manager decides
                              </span>
                            )}
                            {cl.status === 'rejected' && cl.reject_reason && <p className="mt-1 text-xs text-neutral-mid">{cl.reject_reason}</p>}
                          </td>
                          <td className="px-2 py-2 text-xs text-neutral-mid">{fmtWhen(cl.reached_at)}</td>
                          <td className="px-2 py-2 text-xs text-neutral-mid">{cl.decided_by_name ?? ''}</td>
                          <td className="px-2 py-2 text-xs text-neutral-mid">{cl.given_by_name ? `${cl.given_by_name}${cl.given_at ? `, ${fmtWhen(cl.given_at)}` : ''}` : ''}</td>
                          <td className="px-2 py-2">
                            {cl.status === 'approved' && (
                              <button type="button" className={btnPrimary} disabled={givingId === cl.id} onClick={() => markGiven(cl)}>{givingId === cl.id ? 'Saving...' : 'Mark as given'}</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
