'use client'

// Hub: "Incentive approvals" for care managers. Approve a campaign before it goes live, approve each reward payout,
// and mark approved rewards as given. The manager is spending the home's money, so the wording is plain and careful.
import { useEffect, useState } from 'react'
import { createIncentivesClient, type IncentiveCampaignDetail, type IncentiveClaim } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { Loader2, Check, X, Trophy, Gift } from 'lucide-react'

type Queue = Awaited<ReturnType<ReturnType<typeof createIncentivesClient>['queue']>>
type Meta = Awaited<ReturnType<ReturnType<typeof createIncentivesClient>['meta']>>

export const incentiveQueueKey = (userId: string) => `hub-incentive-queue-${userId}`

const monthName = (m: string) => {
  const d = new Date(`${m}-01T00:00:00`)
  return isNaN(d.getTime()) ? m : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const money = (p: number) => `£${(p / 100).toFixed(2)}`

type Pending = { kind: 'campaign' | 'claim'; id: string; label: string } | null

export function IncentiveApprovalsView({ token, userId, onChange }: { token: string; userId: string; onChange?: () => void }) {
  const api = createIncentivesClient(token)
  const q = useCachedQuery<Queue>(incentiveQueueKey(userId), () => api.queue())
  const meta = useCachedQuery<Meta>(`hub-incentive-meta-${userId}`, () => api.meta())
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [rejecting, setRejecting] = useState<Pending>(null)
  const [reason, setReason] = useState('')

  // Refresh on focus, like the audit approvals.
  useEffect(() => {
    const onFocus = () => { q.reload() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const eventLabel = (key: string) => meta.data?.events.find(e => e.key === key)?.label ?? key.replace(/_/g, ' ')

  async function run(id: string, label: string, fn: () => Promise<unknown>, done: string) {
    setBusy(id); setError(''); setMsg('')
    try { await fn(); setMsg(done); setRejecting(null); setReason(''); await q.reload(); onChange?.() }
    catch (e: any) { setError(e?.message ?? `Could not ${label}.`) }
    finally { setBusy(null) }
  }

  const approveCampaign = (c: IncentiveCampaignDetail) => {
    if (!confirm(`Approve "${c.name}" for ${monthName(c.month)}? It will go live and staff will start earning points towards these rewards.`)) return
    run(c.id, 'approve', () => api.approveCampaign(c.id), `Approved "${c.name}". It is now live.`)
  }
  const approveClaim = (c: IncentiveClaim) => {
    if (!confirm(`Approve "${c.reward_title}" for ${c.user_name}? This confirms they have earned it and the home will provide it.`)) return
    run(c.id, 'approve', () => api.approveClaim(c.id), `Approved "${c.reward_title}" for ${c.user_name}.`)
  }
  const markGiven = (c: IncentiveClaim) => {
    if (!confirm(`Confirm that "${c.reward_title}" has been given to ${c.user_name}?`)) return
    run(c.id, 'mark as given', () => api.markGiven(c.id), `Recorded that "${c.reward_title}" was given to ${c.user_name}.`)
  }
  function submitReject() {
    if (!rejecting) return
    if (!reason.trim()) { setError('Please give a reason so the right people understand.'); return }
    const r = reason.trim()
    if (rejecting.kind === 'campaign') run(rejecting.id, 'reject', () => api.rejectCampaign(rejecting.id, r), `Rejected "${rejecting.label}". The reason has been saved.`)
    else run(rejecting.id, 'reject', () => api.rejectClaim(rejecting.id, r), `Rejected ${rejecting.label}. The place passes to the next person if there is one.`)
  }

  if (q.loading) return <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading...</div>

  const campaigns = q.data?.campaigns ?? []
  const claims = q.data?.claims ?? []
  const toApprove = claims.filter(c => c.status === 'held')
  const toGive = claims.filter(c => c.status === 'approved')

  const rejectBox = (p: NonNullable<Pending>) => (
    <div className="mt-3 rounded-md border border-rose-100 bg-rose-50/50 p-3">
      <label htmlFor={`rej-${p.id}`} className="text-xs font-medium text-neutral-dark">Reason for rejecting (needed)</label>
      <textarea id={`rej-${p.id}`} value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-teal focus:outline-none" />
      <div className="mt-2 flex gap-2">
        <button onClick={submitReject} disabled={busy === p.id} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-btn bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"><X size={14} /> Reject</button>
        <button onClick={() => { setRejecting(null); setReason(''); setError('') }} className="min-h-[40px] rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-xl font-bold text-neutral-dark">Incentive approvals</h2>
        <p className="mt-1 text-xs text-neutral-mid">Rewards cost the home money. Please check each one carefully before you approve it. CareStream records and reports; it does not buy or pay for anything.</p>
        {msg && <div role="status" className="mt-4 flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-2.5 text-xs text-green-800"><Check size={15} /> {msg}</div>}
        {error && <div role="alert" className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</div>}

        {/* Campaigns waiting to go live */}
        <h3 className="mt-6 text-xs font-bold text-neutral-dark">Incentives waiting to go live</h3>
        {campaigns.length === 0 ? (
          <p className="mt-2 rounded-card border border-gray-100 bg-white px-4 py-5 text-xs text-neutral-mid">Nothing is waiting to go live.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {campaigns.map(c => (
              <li key={c.id} className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
                <p className="break-words text-sm font-bold text-neutral-dark">{c.name}</p>
                <p className="text-xs text-neutral-mid">{monthName(c.month)} · made by {c.created_by_name ?? 'an admin'} · applies to {c.everyone ? 'everyone on staff' : `${c.participants_count} chosen ${c.participants_count === 1 ? 'person' : 'people'}`}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-neutral-mid">How points are earned</p>
                <ul className="mt-1 space-y-0.5 text-xs text-neutral-dark">
                  {c.rules.map((r, i) => <li key={i}>{eventLabel(r.event)}: {r.points} {r.points === 1 ? 'point' : 'points'}{r.max_per_month ? `, up to ${r.max_per_month} times` : ''}</li>)}
                </ul>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-neutral-mid">Rewards</p>
                <ul className="mt-1 space-y-2">
                  {c.rewards.map((r, i) => (
                    <li key={r.id ?? r.key ?? i} className="flex items-start gap-3 rounded-md border border-gray-100 bg-neutral-light/20 p-2">
                      {r.image_data
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.image_data} alt="" className="h-10 w-10 shrink-0 rounded border border-gray-100 object-contain" />
                        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-teal/10 text-teal"><Gift size={18} aria-hidden="true" /></span>}
                      <div className="min-w-0 text-xs text-neutral-dark">
                        <p className="break-words font-medium">{r.title}</p>
                        <p className="text-xs text-neutral-mid">
                          {r.target_points} points needed · {r.quantity === null ? 'everyone who qualifies' : `${r.quantity} ${r.quantity === 1 ? 'place' : 'places'}`}{r.value_pence !== null ? ` · ${money(r.value_pence)} each` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {rejecting?.kind === 'campaign' && rejecting.id === c.id ? rejectBox(rejecting) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => approveCampaign(c)} disabled={busy === c.id} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
                    <button onClick={() => { setRejecting({ kind: 'campaign', id: c.id, label: c.name }); setReason(''); setError('') }} disabled={busy === c.id} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14} /> Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Reward payouts */}
        <h3 className="mt-8 text-xs font-bold text-neutral-dark">Rewards waiting for approval</h3>
        {toApprove.length === 0 ? (
          <p className="mt-2 rounded-card border border-gray-100 bg-white px-4 py-5 text-xs text-neutral-mid">No rewards are waiting for approval.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {toApprove.map(c => (
              <li key={c.id} className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
                <p className="break-words text-sm font-bold text-neutral-dark">{c.user_name}</p>
                <p className="text-xs text-neutral-dark">{c.reward_title}{c.value_pence !== null ? ` (${money(c.value_pence)})` : ''}</p>
                <p className="text-xs text-neutral-mid">{c.campaign_name} · {c.rank ? `place ${c.rank}` : 'no place number'} · reached {when(c.reached_at)}</p>
                {c.tied && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">This person reached the target at exactly the same time as someone else and only one place is left. Please decide carefully.</p>}
                {rejecting?.kind === 'claim' && rejecting.id === c.id ? rejectBox(rejecting) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => approveClaim(c)} disabled={busy === c.id} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
                    <button onClick={() => { setRejecting({ kind: 'claim', id: c.id, label: `${c.user_name}'s ${c.reward_title}` }); setReason(''); setError('') }} disabled={busy === c.id} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14} /> Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {toGive.length > 0 && (
          <>
            <h3 className="mt-8 text-xs font-bold text-neutral-dark">Approved, ready to give</h3>
            <ul className="mt-2 space-y-2">
              {toGive.map(c => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-100 bg-white p-4">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-medium text-neutral-dark">{c.user_name}: {c.reward_title}</p>
                    <p className="text-xs text-neutral-mid">{c.campaign_name}{c.decided_by_name ? ` · approved by ${c.decided_by_name}` : ''}</p>
                  </div>
                  <button onClick={() => markGiven(c)} disabled={busy === c.id} className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-btn border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/5 disabled:opacity-50">{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />} Mark as given</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
