// Paid extras offered beside the shop's checkouts. Time-savers: buyers who would rather pay a
// little than do the job themselves. Priced here only; the browser sends keys, never amounts.

export const ADDONS = {
  'team-setup': { name: 'Team set-up: we invite your staff for you', pence: 1500, funnel: 'training' },
  'priority-policy': { name: 'Priority delivery: your policies within 24 hours of your answers', pence: 1500, funnel: 'policies' },
} as const

export type AddonKey = keyof typeof ADDONS

/** Keys from a request body, kept only if they exist and belong to this funnel. */
export function cleanAddons(raw: unknown, funnel: 'training' | 'policies'): AddonKey[] {
  if (!Array.isArray(raw)) return []
  const out = new Set<AddonKey>()
  for (const k of raw) if (typeof k === 'string' && k in ADDONS && ADDONS[k as AddonKey].funnel === funnel) out.add(k as AddonKey)
  return [...out]
}

/** Add-on keys back from a Stripe session's metadata. */
export function addonsFromMeta(md: Record<string, string> | undefined): AddonKey[] {
  return String(md?.addons ?? '').split(',').filter((k): k is AddonKey => k in ADDONS)
}
