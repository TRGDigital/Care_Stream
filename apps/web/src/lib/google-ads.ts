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
export function reportPurchase(kind: PurchaseKind, valuePence: number | undefined, transactionId: string | undefined) {
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
