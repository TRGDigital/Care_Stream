// "Ship now" batch (October 2026): VAT clarity, per learner and total prices, the Stripe line,
// the sign-off box, duration and certificate by the price, the freshness line, the CPD mark under
// the buy button, the Skills for Care wording and the stripped header for Google Ads visitors.
//
// ONE switch. While SHIP_NOW_LIVE is false production renders exactly what it did before; the
// preview build of the `ship-now-demo` branch turns the batch on by itself (next.config.mjs sets
// NEXT_PUBLIC_SHIP_NOW_PREVIEW only for that branch's Vercel preview). Going live is flipping the
// constant below to true. Nothing else needs to change.
//
// The review highlight: add ?shipdemo=1 to any URL and every new or changed element gets a yellow
// background, an outline and a small label naming the item (ship-now.css, keyed off the
// data-shipnow attribute). Without ?shipdemo=1 the changes show with no yellow, as they would ship.
// The attributes and the CSS are harmless when left in; to remove them, delete ship-now.css and
// its import, and the data-shipnow / data-shipnow-label attributes.

export const SHIP_NOW_LIVE = false

export const SHIP_NOW = SHIP_NOW_LIVE || process.env.NEXT_PUBLIC_SHIP_NOW_PREVIEW === '1'

/** UK VAT. Stripe (Managed Payments, merchant of record) adds it on top of every shop price at
 *  payment, worked out from the buyer's billing address; the shop prices are all ex VAT. */
export const VAT_RATE = 0.2

export function withVat(exPence: number): { ex: number; vat: number; inc: number } {
  const vat = Math.round(exPence * VAT_RATE)
  return { ex: exPence, vat, inc: exPence + vat }
}

export const gbp2 = (p: number) => `£${(p / 100).toFixed(2)}`

/** "£25.99 + VAT (£31.19 inc VAT)" */
export function vatText(exPence: number): string {
  return `${gbp2(exPence)} + VAT (${gbp2(withVat(exPence).inc)} inc VAT)`
}

/** The attributes that mark an element for the ?shipdemo=1 highlight. */
export function sn(key: string, label: string): Record<string, string> {
  return { 'data-shipnow': key, 'data-shipnow-label': `Ship now: ${label}` }
}

/** Came from Google Ads: gclid, or utm_source=google with utm_medium=cpc, on the landing URL. */
export function isPaidLanding(search: string): boolean {
  const q = new URLSearchParams(search)
  if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) return true
  return (q.get('utm_source') ?? '').toLowerCase() === 'google' && ['cpc', 'ppc', 'paid'].includes((q.get('utm_medium') ?? '').toLowerCase())
}
