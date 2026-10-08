// The CPD course bundles and their price. Pure functions: this file is copied byte for byte to
// apps/web/src/lib/bundle-rules.ts (beside offer-rules.ts in both), so the price the CPD courses
// page and the basket show and the price Stripe charges come from the same code. Change one,
// copy it to the other.
//
// Best price wins (Len, 2026-10-08): nothing stacks on a bundle. A bundle line costs the bundle
// price per learner, or what the same courses cost as single licences for that many learners
// under the live offer and the team discount, whichever is lower. Bundle learners never count
// towards the team discount on single courses.
//
// In a basket a bundle is the slug "bundle:<key>" with the number of learners as its quantity.

import { licenceDeal, type Offer } from './offer-rules'

export type BundleKey = 'complete' | 'refresher'

export const BUNDLE_PREFIX = 'bundle:'

const REFRESHERS = [
  'moving-and-handling-of-people', 'infection-prevention-and-control', 'medication-administration-and-competency',
  'food-hygiene', 'general-health-and-safety-awareness', 'end-of-life-palliative-care', 'mental-health-awareness',
  'coshh-control-of-substances-hazardous-to-health', 'gdpr-data-protection',
]

export const BUNDLES: Record<BundleKey, { key: BundleKey; name: string; who: string; slugs: string[]; pence: number }> = {
  complete: { key: 'complete', name: 'Complete CPD bundle', who: 'For new starters', slugs: ['care-certificate', ...REFRESHERS], pence: 15900 },
  refresher: { key: 'refresher', name: 'Annual refresher bundle', who: 'For existing staff', slugs: REFRESHERS, pence: 13900 },
}

/** The bundle a basket slug names ("bundle:complete"), or null. */
export function bundleOf(slug: string): (typeof BUNDLES)[BundleKey] | null {
  if (!slug.startsWith(BUNDLE_PREFIX)) return null
  const key = slug.slice(BUNDLE_PREFIX.length)
  return key === 'complete' || key === 'refresher' ? BUNDLES[key] : null
}

// The team discount on single licences (as the basket checkout applies it).
const TEAM_TIERS = [{ min: 100, pct: 40 }, { min: 50, pct: 30 }, { min: 20, pct: 20 }, { min: 10, pct: 10 }]
const teamPct = (qty: number) => TEAM_TIERS.find(t => qty >= t.min)?.pct ?? 0

/** What these courses cost as single licences for `learners` people each: the fewest paid
 *  licences that, with any free ones from a "buy X get Y" offer, cover every learner; the team
 *  discount on the paid total, replaced by an offer's percentage only when that is bigger. */
export function singlesPence(offers: Offer[], slugs: string[], learners: number, unit: number, now = Date.now()): number {
  if (learners < 1) return 0
  const paid = slugs.map(slug => {
    let p = 1
    while (p < learners && p + licenceDeal(offers, slug, p, now).free < learners) p++
    return { slug, p }
  })
  const team = teamPct(paid.reduce((t, x) => t + x.p, 0))
  return paid.reduce((t, { slug, p }) => {
    const pct = Math.max(team, licenceDeal(offers, slug, p, now).pct)
    return t + Math.round(unit * (1 - pct / 100)) * p
  }, 0)
}

export interface BundleQuote {
  /** What each learner costs, in pence, and the line total (perLearner × learners). */
  perLearner: number
  total: number
  /** The two prices compared, and the courses at full price. */
  bundleTotal: number
  singlesTotal: number
  listTotal: number
  winner: 'bundle' | 'singles'
}

export function bundleQuote(offers: Offer[], key: BundleKey, learners: number, unit: number, now = Date.now()): BundleQuote {
  const b = BUNDLES[key]
  const n = Math.max(1, Math.floor(learners))
  const bundleTotal = b.pence * n
  const singlesTotal = singlesPence(offers, b.slugs, n, unit, now)
  const winner = singlesTotal < bundleTotal ? 'singles' : 'bundle'
  // Rounded down, so a bundle line never costs more than the courses would on their own.
  const perLearner = winner === 'bundle' ? b.pence : Math.floor(singlesTotal / n)
  return { perLearner, total: perLearner * n, bundleTotal, singlesTotal, listTotal: unit * b.slugs.length * n, winner }
}
