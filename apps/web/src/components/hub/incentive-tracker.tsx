'use client'

// A small live tracker for the top panel: the points a person has earned this month and how far they are from the next
// reward. Shown only while they are in a live incentive (Professional and Enterprise). Uses the same cached query as
// My incentives, so it paints instantly and never shows anyone else's points.

import { useEffect } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createIncentivesClient } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { incentivesMineKey } from '@/components/hub/my-incentives-view'

export function useIncentiveTracker(token: string | undefined, userId: string) {
  const q = useCachedQuery(token ? incentivesMineKey(userId) : null, () => createIncentivesClient(token as string).mine())
  const reload = q.reload
  useEffect(() => {
    if (!token) return
    const onFocus = () => { reload() }
    window.addEventListener('focus', onFocus)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') reload() }, 2 * 60_000)
    return () => { window.removeEventListener('focus', onFocus); clearInterval(timer) }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  const live = q.data?.enabled ? q.data.campaigns.find(c => c.status === 'live') : undefined
  if (!live || live.rewards.length === 0) return null
  const targets = live.rewards.map(r => r.target_points).sort((a, b) => a - b)
  const next = targets.find(t => t > live.points)
  const goal = next ?? targets[targets.length - 1]!
  return { points: live.points, goal, allReached: next === undefined, pct: Math.max(0, Math.min(100, Math.round((live.points / goal) * 100))), name: live.name }
}

export function IncentiveTracker({ token, userId, compact }: { token: string | undefined; userId: string; compact?: boolean }) {
  const t = useIncentiveTracker(token, userId)
  if (!t) return null
  const label = t.allReached ? `${t.points} points. You have reached every reward.` : `${t.points} of ${t.goal} points to your next reward`
  return (
    <Link href="/chat?view=my-incentives" aria-label={`My incentives: ${label}`} title={label}
      className={`flex items-center gap-2 rounded-full border border-teal/30 bg-teal/5 text-teal-dark transition-colors hover:bg-teal/10 ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}>
      <Trophy size={compact ? 14 : 16} className="shrink-0 text-teal" aria-hidden="true" />
      <span className="whitespace-nowrap text-xs font-bold">{t.points}<span className="font-medium text-neutral-mid"> / {t.goal}{compact ? '' : ' pts'}</span></span>
      <span className={`overflow-hidden rounded-full bg-gray-200 ${compact ? 'h-1.5 w-10' : 'h-2 w-20'}`} role="progressbar" aria-valuenow={t.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to your next reward">
        <span className={`block h-full rounded-full ${t.allReached ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${t.pct}%` }} />
      </span>
    </Link>
  )
}
