// Time-boxed promotional offers on training licences. The web app shows these
// (apps/web/src/lib/offers.ts); this copy is the one that counts: free licences are
// worked out here when the Stripe session is created and carried in its metadata, so a
// buyer who pays just before the deadline still receives them on reconcile.

interface LicenceOffer { key: string; slugs: string[]; starts: string; ends: string }

const OFFERS: LicenceOffer[] = [
  // Halloween 2 for 1 on the Care Certificate (the course PPC traffic lands on).
  { key: 'halloween-2026-2for1', slugs: ['care-certificate'], starts: '2026-10-01T00:00:00+01:00', ends: '2026-11-01T00:00:00+00:00' },
]

export function activeLicenceOffer(slug: string, now = Date.now()): LicenceOffer | null {
  return OFFERS.find(o => o.slugs.includes(slug) && now >= Date.parse(o.starts) && now < Date.parse(o.ends)) ?? null
}

// 2 for 1: one free licence for every licence paid for.
export function freeLicencesFor(slug: string, qty: number, now = Date.now()): number {
  return activeLicenceOffer(slug, now) ? Math.max(0, Math.floor(qty)) : 0
}

// Policies: buy one, get a second free (individual policies only, not packs). Paired most
// expensive first; the cheaper of each pair is free. The web basket mirrors this
// (apps/web/src/lib/offers.ts freePolicySlugs).
const POLICY_OFFER = { key: 'halloween-2026-policies-2for1', starts: '2026-10-01T00:00:00+01:00', ends: '2026-11-01T00:00:00+00:00' }

/** The live policy offer's key, for tagging sales; null when none is running. */
export function activePolicyOfferKey(now = Date.now()): string | null {
  return policyOfferActive(now) ? POLICY_OFFER.key : null
}

export function policyOfferActive(now = Date.now()): boolean {
  return now >= Date.parse(POLICY_OFFER.starts) && now < Date.parse(POLICY_OFFER.ends)
}

/** For priced basket rows, the index of the paid row each free row is paired with
 *  (free index → paid index). Empty when the offer is not live. */
export function freePolicyPairs(rows: { kind: string; pence: number }[], now = Date.now()): Map<number, number> {
  const pairs = new Map<number, number>()
  if (!policyOfferActive(now)) return pairs
  const sorted = rows.map((r, n) => ({ ...r, n })).filter(r => r.kind === 'policy')
    .sort((a, b) => b.pence - a.pence || a.n - b.n)
  for (let k = 1; k < sorted.length; k += 2) pairs.set(sorted[k].n, sorted[k - 1].n)
  return pairs
}
