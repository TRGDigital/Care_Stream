'use client'

// Shared hook for plan feature gating across the admin console.
// Fetches /billing/summary once (cached per token for the session) and exposes
// the plan's feature flags + the monthly annual-allocation licence usage.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type PlanFeatures } from '@/lib/api-client'

// Module-level cache so navigating between admin pages doesn't refetch.
const cache = new Map<string, Promise<PlanFeatures | null>>()

function load(token: string): Promise<PlanFeatures | null> {
  const existing = cache.get(token)
  if (existing) return existing
  const p = createApiClient(token).billing.summary()
    .then(s => s.features ?? null)
    .catch(() => null)
  cache.set(token, p)
  return p
}

export function usePlanFeatures(): { features: PlanFeatures | null; loading: boolean } {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [features, setFeatures] = useState<PlanFeatures | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let active = true
    load(token).then(f => { if (active) { setFeatures(f); setLoading(false) } })
    return () => { active = false }
  }, [token])

  return { features, loading }
}

// Helper: does the plan include a feature? Defaults to true while loading so we
// never flash a locked state on a feature the tenant actually has.
export function hasFeature(features: PlanFeatures | null, key: keyof PlanFeatures): boolean {
  if (!features) return true
  return Boolean(features[key])
}
