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
