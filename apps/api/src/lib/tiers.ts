// Tenant tiers, in one place.
//
// Tiers that are bought outright, or given free, rather than subscribed to. None of them has a
// Stripe subscription, so none goes through the card-up-front billing gate. This list used to be
// copied into auth.ts and billing.ts, which is how a new tier gets missed in one of them.

import { prisma } from '../db/client'

export const NO_SUBSCRIPTION_TIERS = new Set(['training_only', 'policies_only', 'free'])

export function needsBillingFor(t: { tier?: string | null; subscription_status?: string | null; stripe_subscription_id?: string | null } | null | undefined): boolean {
  if (!t) return true
  return !NO_SUBSCRIPTION_TIERS.has(t.tier ?? '') && t.subscription_status !== 'active' && !t.stripe_subscription_id
}

// Tier lookup with a short in-memory cache, for per-request guards. Thirty seconds of
// staleness is acceptable (an upgrade is also pushed through clearTierCache on the instance
// that handles it). Failures return 'full' so a database blip can never lock paying tenants out.
const cache = new Map<string, { tier: string; at: number }>()
const TTL_MS = 30_000

export async function tierOf(tenantId: string): Promise<string> {
  const hit = cache.get(tenantId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tier
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
    const tier = (t?.tier as string) ?? 'full'
    cache.set(tenantId, { tier, at: Date.now() })
    return tier
  } catch {
    return 'full'
  }
}

export function clearTierCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId)
  else cache.clear()
}

export const isFreeTier = (tier: string | null | undefined): boolean => tier === 'free'
