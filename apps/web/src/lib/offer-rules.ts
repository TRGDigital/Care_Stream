// The rules every CareStream offer runs on. Pure functions, no imports: this file is copied
// byte for byte to apps/web/src/lib/offer-rules.ts so the price a buyer is shown and the price
// Stripe charges come from the same code. Change one, copy it to the other.
//
// Offers themselves live in the Funnel Insights offer calendar and are synced hourly into the
// site_offers table. Each has a kind and its settings (params):
//   free_units   training  { buy, free }        for every `buy` licences paid, `free` more free
//   percent_off  either    { pct, minQty? }     pct off in-scope items (minQty: training licences)
//   amount_off   either    { pence }            pence off each in-scope item (e.g. a pack)
//   group_free   policies  { group }            in every `group` individual policies, the cheapest is free
//   gift         policies  { gift, requires?, minPolicies? }  a named policy added free when met
//   pack_bonus   policies  { pack, free }       buy the pack, `free` policies from outside it free
//
// products scopes an offer: slugs, plus 'all-policies' (every individual policy) and 'all-packs'.

export interface Offer {
  key: string
  name: string
  range: 'training' | 'policies' | 'both'
  products: string[]
  kind: 'free_units' | 'percent_off' | 'amount_off' | 'group_free' | 'gift' | 'pack_bonus'
  params: Record<string, any>
  label: string | null
  headline: string | null
  multi_text: string | null
  starts_on: string
  ends_on: string
  starts_at: string
  ends_at: string
}

export const isLive = (o: Offer, now = Date.now()) => Date.parse(o.starts_at) <= now && now < Date.parse(o.ends_at)

export function inScope(o: Offer, slug: string, isPolicy: boolean): boolean {
  if (!slug) return false
  const p = o.products || []
  if (p.includes(slug)) return true
  if (slug.startsWith('bundle:')) return p.includes('all-packs')
  if (isPolicy) return p.includes('all-policies')
  return false
}

const forTraining = (o: Offer) => o.range === 'training' || o.range === 'both'
const forPolicies = (o: Offer) => o.range === 'policies' || o.range === 'both'
const int = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : d)

// ─── Training ─────────────────────────────────────────────────────────────────

export interface LicenceDeal { offer: Offer | null; free: number; pct: number }

/** What an offer gives on `qty` licences of one course. */
export function licenceDeal(offers: Offer[], slug: string, qty: number, now = Date.now()): LicenceDeal {
  for (const o of offers) {
    if (!isLive(o, now) || !forTraining(o) || !inScope(o, slug, false)) continue
    if (o.kind === 'free_units') {
      const buy = Math.max(1, int(o.params.buy, 1)), free = int(o.params.free, 1)
      return { offer: o, free: Math.floor(qty / buy) * free, pct: 0 }
    }
    if (o.kind === 'percent_off') {
      const min = int(o.params.minQty, 0)
      if (qty >= min) return { offer: o, free: 0, pct: Math.min(90, int(o.params.pct)) }
    }
  }
  return { offer: null, free: 0, pct: 0 }
}

/** The offer on a course regardless of quantity, for showing on its pages. */
export function licenceOffer(offers: Offer[], slug: string, now = Date.now()): Offer | null {
  return offers.find(o => isLive(o, now) && forTraining(o) && inScope(o, slug, false)
    && (o.kind === 'free_units' || o.kind === 'percent_off')) ?? null
}

/** What one licence works out at under the offer, in pence (rounded down). */
export function licenceEffectivePence(o: Offer, unit: number): number {
  if (o.kind === 'free_units') {
    const buy = Math.max(1, int(o.params.buy, 1)), free = int(o.params.free, 1)
    return Math.floor((unit * buy) / (buy + free))
  }
  if (o.kind === 'percent_off') return Math.round(unit * (1 - int(o.params.pct) / 100))
  return unit
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export interface PolicyRow { kind: 'policy' | 'bundle'; key: string; pence: number }
export interface PolicyDeal {
  offer: Offer | null
  /** Price of each row after the offer (0 when free). */
  pence: number[]
  /** Rows that are free. */
  free: Set<number>
  /** A gift policy to add to the basket free (not already in it). */
  gift: string | null
}

/** The offer applied to a policy basket. `packMembers`: policy slugs in each pack, by pack key
 *  (needed for pack_bonus, so the free policies come from outside the pack). */
export function policyDeal(offers: Offer[], rows: PolicyRow[], packMembers: Record<string, string[]> = {}, now = Date.now()): PolicyDeal {
  const pence = rows.map(r => r.pence)
  const free = new Set<number>()
  const isPol = (r: PolicyRow) => r.kind === 'policy'
  const slugOf = (r: PolicyRow) => (r.kind === 'bundle' ? `bundle:${r.key}` : r.key)

  for (const o of offers) {
    if (!isLive(o, now) || !forPolicies(o)) continue
    const scoped = rows.map((r, n) => ({ r, n })).filter(({ r }) => inScope(o, slugOf(r), isPol(r)))
    let applied = false

    if (o.kind === 'group_free') {
      const g = Math.max(2, int(o.params.group, 2))
      const sorted = scoped.filter(({ r }) => isPol(r)).sort((a, b) => b.r.pence - a.r.pence || a.n - b.n)
      for (let k = 0; k + g <= sorted.length; k += g) { free.add(sorted[k + g - 1].n); applied = true }
    } else if (o.kind === 'percent_off') {
      const pct = Math.min(90, int(o.params.pct))
      for (const { r, n } of scoped) { pence[n] = Math.round(r.pence * (1 - pct / 100)); applied = applied || pct > 0 }
    } else if (o.kind === 'amount_off') {
      const off = int(o.params.pence)
      for (const { r, n } of scoped) { pence[n] = Math.max(0, r.pence - off); applied = applied || off > 0 }
    } else if (o.kind === 'gift') {
      const gift = String(o.params.gift || '')
      const others = rows.filter(r => isPol(r) && r.key !== gift)
      const requires: string[] = Array.isArray(o.params.requires) ? o.params.requires : []
      const met = requires.length
        ? requires.every(s => rows.some(r => isPol(r) && r.key === s))
        : others.length >= Math.max(1, int(o.params.minPolicies, 1))
      if (gift && met) {
        const at = rows.findIndex(r => isPol(r) && r.key === gift)
        if (at >= 0) free.add(at)
        for (let n = 0; n < rows.length; n++) if (free.has(n)) pence[n] = 0
        return { offer: o, pence, free, gift: at >= 0 ? null : gift }
      }
    } else if (o.kind === 'pack_bonus') {
      const pack = String(o.params.pack || '')
      if (rows.some(r => r.kind === 'bundle' && r.key === pack)) {
        const inPack = new Set(packMembers[pack] || [])
        const pick = rows.map((r, n) => ({ r, n })).filter(({ r }) => isPol(r) && !inPack.has(r.key))
          .sort((a, b) => b.r.pence - a.r.pence || a.n - b.n).slice(0, int(o.params.free, 0))
        for (const { n } of pick) { free.add(n); applied = true }
      }
    }

    if (applied) {
      for (const n of free) pence[n] = 0
      return { offer: o, pence, free, gift: null }
    }
  }
  return { offer: null, pence, free, gift: null }
}

/** The offer to show on a policy (or pack) page. */
export function policyOffer(offers: Offer[], slug: string, now = Date.now()): Offer | null {
  const isPolicy = !slug.startsWith('bundle:')
  return offers.find(o => {
    if (!isLive(o, now) || !forPolicies(o)) return false
    if (o.kind === 'gift') {
      const requires: string[] = Array.isArray(o.params.requires) ? o.params.requires : []
      return requires.length ? requires.includes(slug) || o.params.gift === slug : isPolicy
    }
    if (o.kind === 'pack_bonus') return slug === `bundle:${o.params.pack}` || (isPolicy && inScope(o, slug, true))
    return inScope(o, slug, isPolicy)
  }) ?? null
}

/** "Ends midnight, Saturday 31 October" from the last day of the offer. */
export function endsText(o: Offer): string {
  const d = new Date(`${o.ends_on}T12:00:00Z`)
  return `Ends midnight, ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })}`
}
