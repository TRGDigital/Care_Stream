'use client'

// Hub: "My incentives". A member of staff sees only their OWN points, never anyone else's.
import { createIncentivesClient, type MyCampaign, type MyReward } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { Loader2, Trophy, Gift } from 'lucide-react'

type Mine = Awaited<ReturnType<ReturnType<typeof createIncentivesClient>['mine']>>

export const incentivesMineKey = (userId: string) => `hub-incentives-mine-${userId}`

const monthName = (m: string) => {
  const d = new Date(`${m}-01T00:00:00`)
  return isNaN(d.getTime()) ? m : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function RewardCard({ r, onOpenTraining, outstanding }: { r: MyReward; onOpenTraining: () => void; outstanding: number }) {
  const status = r.claim?.status ?? null
  if (status === 'forfeited') return null
  const toGo = Math.max(0, r.target_points - r.points)
  const pct = Math.max(0, Math.min(100, Math.round(r.pct ?? (r.target_points > 0 ? (r.points / r.target_points) * 100 : 0))))
  const done = status === 'held' || status === 'approved' || status === 'given'

  let statusBox: React.ReactNode
  if (status === 'given') {
    statusBox = <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-800">Given. Well done.</p>
  } else if (status === 'approved') {
    statusBox = <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-800">Approved, your reward is on its way.</p>
  } else if (status === 'held') {
    statusBox = <p className="rounded-md bg-teal/10 px-3 py-2 text-sm font-medium text-teal-dark">You have reached this. A care manager will approve it.</p>
  } else if (status === 'missed') {
    statusBox = (
      <div className="rounded-md bg-amber-50 px-3 py-3">
        <p className="whitespace-pre-line text-sm text-neutral-dark">{r.thank_you || 'Thank you for all your effort this month. The places have now gone, but your training still matters.'}</p>
        {outstanding > 0 && <p className="mt-2 text-sm text-neutral-dark">You have {plural(outstanding, 'module', 'modules')} waiting for you.</p>}
        <button onClick={onOpenTraining} className="mt-3 min-h-[44px] rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Open My Training</button>
      </div>
    )
  } else if (status === 'rejected') {
    statusBox = <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-neutral-dark">A care manager was not able to approve this one. Please have a word with your manager if you would like to know more.</p>
  } else if (toGo === 0) {
    statusBox = <p className="rounded-md bg-teal/10 px-3 py-2 text-sm font-medium text-teal-dark">You have enough points. Your place is being checked.</p>
  } else {
    statusBox = (
      <p className="text-sm text-neutral-dark">
        <span className="font-semibold">{plural(toGo, 'point', 'points')} to go.</span>
        {r.places_total !== null && r.places_left !== null && <span className="text-neutral-mid"> {r.places_left} of {r.places_total} places left.</span>}
      </p>
    )
  }

  return (
    <li className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        {r.image_data
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={r.image_data} alt="" className="h-14 w-14 shrink-0 rounded-md border border-gray-100 object-contain" />
          : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal"><Gift size={24} aria-hidden="true" /></span>}
        <div className="min-w-0">
          <h4 className="break-words text-xl font-bold leading-snug text-neutral-dark">{r.title}</h4>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm text-neutral-dark">
          <span className="font-semibold">{Math.min(r.points, r.target_points)} of {r.target_points} points</span>
          <span className="text-xs text-neutral-mid">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${r.title}: ${Math.min(r.points, r.target_points)} of ${r.target_points} points`} className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3">{statusBox}</div>
    </li>
  )
}

function Campaign({ c, outstanding, onOpenTraining }: { c: MyCampaign; outstanding: number; onOpenTraining: () => void }) {
  const rewards = c.rewards.filter(r => r.claim?.status !== 'forfeited')
  return (
    <section className="space-y-3" aria-labelledby={`inc-${c.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`inc-${c.id}`} className="break-words text-xl font-bold text-neutral-dark">{c.name}</h3>
          <p className="text-sm text-neutral-mid">{monthName(c.month)}{c.status === 'ended' ? ' (finished)' : ''}</p>
        </div>
        <p className="rounded-full bg-teal/10 px-3 py-1 text-sm font-semibold text-teal-dark">{plural(c.points, 'point', 'points')} so far</p>
      </div>

      {rewards.length > 0 && (
        <ul className="space-y-3">
          {rewards.map(r => <RewardCard key={r.key} r={r} outstanding={outstanding} onOpenTraining={onOpenTraining} />)}
        </ul>
      )}

      <div className="rounded-card border border-gray-100 bg-white p-4">
        <h4 className="text-base font-bold text-neutral-dark">Your points</h4>
        {c.entries.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-mid">No points yet. Every module you finish earns some.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {c.entries.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="break-words text-sm text-neutral-dark">{e.label}</p>
                  <p className="text-xs text-neutral-mid">{dateLabel(e.at)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-teal-dark">{e.points > 0 ? '+' : ''}{e.points}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function MyIncentivesView({ token, userId, onOpenTraining }: { token: string; userId: string; onOpenTraining: () => void }) {
  const q = useCachedQuery<Mine>(incentivesMineKey(userId), () => createIncentivesClient(token).mine())
  if (q.loading) return <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading...</div>

  const campaigns = [...(q.data?.campaigns ?? [])].sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || b.month.localeCompare(a.month))
  const outstanding = q.data?.outstanding_training ?? 0

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-dark"><Trophy size={22} className="text-teal" aria-hidden="true" /> My incentives</h2>
        <p className="mt-1 text-sm text-neutral-mid">You earn points when you complete your training. Reach the target to win the reward. Only you can see your points.</p>
        {q.error && !q.data && <p className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">We could not load your incentives just now. Please try again in a moment.</p>}
        {q.data && campaigns.length === 0 && (
          <div className="mt-6 rounded-card border border-gray-100 bg-white px-6 py-10 text-center">
            <Trophy size={28} className="mx-auto text-teal" aria-hidden="true" />
            <p className="mt-2 text-xl font-medium text-neutral-dark">No incentives are running right now.</p>
          </div>
        )}
        <div className="mt-6 space-y-8">
          {campaigns.map(c => <Campaign key={c.id} c={c} outstanding={outstanding} onOpenTraining={onOpenTraining} />)}
        </div>
      </div>
    </div>
  )
}
