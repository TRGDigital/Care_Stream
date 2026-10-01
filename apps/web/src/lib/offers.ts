// Time-boxed promotional offers on training licences. Display only: the API holds its own copy
// of these rules (apps/api/src/services/training/offers.ts) and is what actually adds the free
// licences, so a page left open past the deadline cannot claim an offer that has ended.

export interface LicenceOffer {
  key: string
  slugs: string[]
  // UK local times, as ISO with offset: the window the offer is live for.
  starts: string
  ends: string
  label: string
  headline: string
  reason: string
  endsText: string
  // What one licence works out at with the offer, and the normal price it replaces.
  effectivePrice: string
  normalPrice: string
  // How the offer scales with quantity, in a line.
  multiText: string
}

export const OFFERS: LicenceOffer[] = [
  {
    key: 'halloween-2026-2for1',
    slugs: ['care-certificate'],
    starts: '2026-10-01T00:00:00+01:00',
    ends: '2026-11-01T00:00:00+00:00',
    label: 'Halloween offer',
    headline: 'Buy one licence, get the second free',
    reason: 'For Halloween, every Care Certificate licence you buy comes with a second one free. Two staff members trained for the price of one, added to your order automatically.',
    endsText: 'Ends midnight, Saturday 31 October',
    effectivePrice: '£12.99',
    normalPrice: '£25.99',
    multiText: 'Every licence you buy comes with one free: buy 1 get 2, buy 5 get 10, buy 10 get 20.',
  },
]

export function activeOffer(slug: string, now = Date.now()): LicenceOffer | null {
  return OFFERS.find(o => o.slugs.includes(slug) && now >= Date.parse(o.starts) && now < Date.parse(o.ends)) ?? null
}

// 2 for 1: one free licence for every licence paid for.
export function freeLicences(slug: string, qty: number, now = Date.now()): number {
  return activeOffer(slug, now) ? Math.max(0, Math.floor(qty)) : 0
}

// Policies: buy one, get a second free. Applies to individual policies only (packs are
// already priced as a bundle). Policies are paired most expensive first and the cheaper of
// each pair is free, so the buyer always pays for the higher priced one.
export const POLICY_OFFER = {
  key: 'halloween-2026-policies-2for1',
  starts: '2026-10-01T00:00:00+01:00',
  ends: '2026-11-01T00:00:00+00:00',
  label: 'Halloween offer',
  headline: 'Buy one policy, get a second free',
  multiText: 'Add any second policy at the same price or less and it is free: buy 2 pay for 1, buy 4 pay for 2. Individual policies only.',
  reason: 'For Halloween, every policy you buy brings a second one free. Two policies written for your service for the price of one, applied automatically in your basket.',
  endsText: 'Ends midnight, Saturday 31 October',
}

export function policyOfferActive(now = Date.now()): boolean {
  return now >= Date.parse(POLICY_OFFER.starts) && now < Date.parse(POLICY_OFFER.ends)
}

// The slugs that are free under the policy offer. Mirrors the API (services/training/offers.ts).
export function freePolicySlugs(items: { slug: string; price_pence: number }[], now = Date.now()): Set<string> {
  if (!policyOfferActive(now)) return new Set()
  const sorted = items.filter(i => !i.slug.startsWith('bundle:'))
    .map((i, n) => ({ ...i, n }))
    .sort((a, b) => b.price_pence - a.price_pence || a.n - b.n)
  return new Set(sorted.filter((_, k) => k % 2 === 1).map(i => i.slug))
}
