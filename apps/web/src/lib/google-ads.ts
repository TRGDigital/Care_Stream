// Google Ads conversion tracking for the CareStream AI ads account.
//
// The tag itself is loaded by <Analytics />, which only runs once the visitor has
// accepted cookies. So a sale is only reported for visitors who consented, and nothing
// here loads a script of its own.
//
// Each conversion action in Google Ads has its own label (Goals → Conversions →
// the action → Tag setup → "send_to": 'AW-…/<label>'). A purchase with no label set
// is simply not reported, so the site works the same until the labels are filled in.

export const GOOGLE_ADS_ID = 'AW-18482372722'

export const GOOGLE_ADS_LABELS = {
  // One "Purchase" action for both shops for now; each sale still carries its own value.
  // Give training its own action later to see the two apart in Google Ads.
  /** Training shop: /buy/success after a module or basket checkout. */
  training_purchase: 'sxmICMGrq4odEPLAiu1E',
  /** Policy shop: /care-policies/thank-you after a policy or bundle checkout. */
  policy_purchase: 'sxmICMGrq4odEPLAiu1E',
} as const

export type PurchaseKind = keyof typeof GOOGLE_ADS_LABELS

type Gtag = (...args: unknown[]) => void

/**
 * Reports a completed purchase with its value. Waits briefly for the consent-gated tag
 * to load, because the thank-you page can finish confirming the payment before it has.
 * Each transaction is sent once per browser; Google also de-duplicates on transaction_id.
 */
export function reportPurchase(kind: PurchaseKind, valuePence: number | undefined, transactionId: string | undefined, email?: string) {
  if (typeof window === 'undefined') return
  const label = GOOGLE_ADS_LABELS[kind]
  if (!label || !transactionId) return

  const key = `gads-conv:${transactionId}`
  try {
    if (sessionStorage.getItem(key)) return
  } catch {}

  let tries = 0
  const send = () => {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag
    if (typeof gtag !== 'function') {
      // No tag after ~10 seconds means no consent, or it failed to load. Nothing is sent.
      if (++tries < 40) window.setTimeout(send, 250)
      return
    }
    // Enhanced conversions: the buyer's email, which the Google tag hashes (SHA-256) in the
    // browser before sending, so Google can match the sale to the ad click when cookies
    // could not. Google only uses it when the visitor granted ad_user_data (cookie consent).
    // Needs "Enhanced conversions for web → Google tag" switched on in Google Ads.
    if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) gtag('set', 'user_data', { email: email.trim().toLowerCase() })
    gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: Math.max(0, (valuePence ?? 0) / 100),
      currency: 'GBP',
      transaction_id: transactionId,
    })
    try {
      sessionStorage.setItem(key, '1')
    } catch {}
  }
  send()
}

/** A page view for an address the page moved to without loading (the course page's /cart/ drawer),
 *  so Google Ads audiences built on that URL include it. Only when the consent-gated tag is loaded. */
export function reportPageView(url: string) {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag !== 'function') return
  gtag('event', 'page_view', { send_to: GOOGLE_ADS_ID, page_location: url, page_path: new URL(url).pathname, page_title: document.title })
}

// Micro-conversions for smart bidding while purchases are few: "Add to cart" (the cart drawer
// opens), "Begin checkout" (Checkout securely is pressed), "Try before you buy" (the demo opened)
// and "Quote request" (an enquiry from a Get a quote link). Their values are set on each action in
// Google Ads, not here.
// Each needs its conversion action's label from Google Ads (Goals → Conversions → the action →
// Tag setup → send_to 'AW-…/<label>'); with no label nothing is sent.
export const GOOGLE_ADS_MICRO_LABELS = {
  add_to_basket: 'LQAfCMju-Y0dEPLAiu1E',
  begin_checkout: 'BCnkCI61-40dEPLAiu1E',
  /** "Try before you buy" pressed on a course page. Label from Google Ads once the action exists. */
  try_demo: '56UuCOSq1ZEdEPLAiu1E',
  /** An enquiry sent from a "Get a quote" link (the contact form with ?about=). Label to add. */
  quote_request: 'NWEnCOCX1ZEdEPLAiu1E',
} as const

export type MicroKind = keyof typeof GOOGLE_ADS_MICRO_LABELS

/** Reports a micro-conversion once per product per visit (Google Ads also counts "One" per click). */
export function reportMicro(kind: MicroKind, product: string) {
  if (typeof window === 'undefined') return
  const label = GOOGLE_ADS_MICRO_LABELS[kind]
  if (!label) return
  const key = `gads-micro:${kind}:${product}`
  try { if (sessionStorage.getItem(key)) return } catch {}
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag !== 'function') return
  gtag('event', 'conversion', { send_to: `${GOOGLE_ADS_ID}/${label}` })
  try { sessionStorage.setItem(key, '1') } catch {}
}
