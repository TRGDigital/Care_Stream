'use client'

// Current-plan card for the admin dashboard: shows the active plan, the monthly
// annual-training-module allocation usage, and an obvious upgrade button.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Sparkles, BadgeCheck } from 'lucide-react'

const gbp = (pence: number) => `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type PlanSummary = Awaited<ReturnType<ReturnType<typeof createApiClient>['billing']['summary']>>

export function PlanCard({ token }: { token: string }) {
  const { data: session } = useSession()
  const cacheKey = `admin-plancard-${session?.user?.email ?? 'guest'}`
  const [data, setData] = useState<PlanSummary | null>(() => persistentCache.get<PlanSummary>(cacheKey) ?? null)
  const [loading, setLoading] = useState(!persistentCache.get<PlanSummary>(cacheKey))

  useEffect(() => {
    let active = true
    createApiClient(token).billing.summary()
      .then(s => { if (active) { setData(s); persistentCache.set(cacheKey, s) } })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, cacheKey])

  if (loading) {
    return <div className="mb-6 h-24 animate-pulse rounded-card border border-gray-100 bg-gray-50" />
  }
  if (!data) return null

  const plan = data.plan_name ?? 'No plan'
  const isEnterprise = plan.toLowerCase() === 'enterprise'
  const lic = data.features?.annual_license
  const used = lic?.used ?? 0
  const limit = lic?.limit ?? null            // null = unlimited
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const nearCap = limit !== null && used >= limit
  const barColor = nearCap ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal'

  return (
    <div className="mb-6 rounded-card border border-teal/20 bg-gradient-to-br from-teal-light/40 to-white p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Plan identity */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/10">
            <BadgeCheck size={20} className="text-teal" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Your plan</p>
            <p className="text-xl font-bold text-neutral-dark">{plan}</p>
            {data.price_monthly_pence != null && (
              <p className="text-xs text-neutral-mid">{gbp(data.price_monthly_pence)} / month</p>
            )}
          </div>
        </div>

        {/* Annual allocation usage */}
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-dark">Annual training allocations</span>
            <span className="text-neutral-mid">
              {limit === null ? `${used} used · Unlimited` : `${used} / ${limit} this month`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div className={`h-2 rounded-full ${limit === null ? 'bg-teal' : barColor}`} style={{ width: limit === null ? '100%' : `${pct}%` }} />
          </div>
          {nearCap && (
            <p className="mt-1 text-[11px] font-medium text-red-600">You&apos;ve used your monthly allocation. Upgrade for more.</p>
          )}
        </div>

        {/* Upgrade / manage */}
        <div className="shrink-0">
          {isEnterprise ? (
            <Link href="/billing" className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-4 py-2 text-sm font-semibold text-teal transition-colors hover:bg-teal-light/40">
              Manage plan
            </Link>
          ) : (
            <Link href="/billing" className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark">
              <Sparkles size={15} /> Upgrade plan
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
