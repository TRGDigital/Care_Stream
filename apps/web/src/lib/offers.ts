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
  },
]

export function activeOffer(slug: string, now = Date.now()): LicenceOffer | null {
  return OFFERS.find(o => o.slugs.includes(slug) && now >= Date.parse(o.starts) && now < Date.parse(o.ends)) ?? null
}

// 2 for 1: one free licence for every licence paid for.
export function freeLicences(slug: string, qty: number, now = Date.now()): number {
  return activeOffer(slug, now) ? Math.max(0, Math.floor(qty)) : 0
}
