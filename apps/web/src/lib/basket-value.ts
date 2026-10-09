// The value sent with the shop events to Funnel Insights (value_pence on add_to_basket,
// buy_now_click, basket_view and checkout_start): what the line costs in the basket at that
// moment, after the live offer and the team (volume) discount, exactly as the basket shows it.
// Ex VAT, like the shop prices and fi_sales.revenue_pence (Stripe adds VAT on top at payment).
// Per line, so the lines of one checkout add up to its total and nothing is counted twice.

import { UNIT_PENCE, discountPctForQty } from './training-commerce'
import { licenceDeal, policyDeal, type Offer } from './offer-rules'
import { bundleOf, bundleQuote, type BundleKey } from './bundle-rules'

/** `qty` paid licences of one course in a basket of `totalQty` single licences: an offer's
 *  percentage replaces the team discount only when bigger; free licences cost nothing. */
export function licenceLinePence(offers: Offer[], slug: string, qty: number, totalQty = qty, unit = UNIT_PENCE): number {
  const b = bundleOf(slug)
  if (b) return bundleQuote(offers, b.key as BundleKey, qty, unit).total
  const pct = Math.max(licenceDeal(offers, slug, qty).pct, discountPctForQty(totalQty))
  return qty * (pct ? Math.round(unit * (1 - pct / 100)) : unit)
}

/** One policy or pack on its own, after any live policy offer. */
export function policyItemPence(offers: Offer[], slug: string, pence: number): number {
  const bundle = slug.startsWith('bundle:')
  return policyDeal(offers, [{ kind: bundle ? 'bundle' : 'policy', key: bundle ? slug.slice(7) : slug, pence }]).pence[0] ?? pence
}

/** Splits the total a basket shows across its lines in proportion to `weights`, the last line
 *  taking the rounding, so the lines' values add up to the total to the penny. */
export function shareTotal(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!weights.length) return []
  if (!sum) return weights.map((_, i) => (i === weights.length - 1 ? total : 0))
  const out = weights.map(w => Math.floor((total * w) / sum))
  out[out.length - 1] += total - out.reduce((a, b) => a + b, 0)
  return out
}
