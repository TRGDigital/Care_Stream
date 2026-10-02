// Funnel Insights (trg-funnel-insights.vercel.app): the cross-site landing page and funnel
// dashboard. The tracker is loaded by <Analytics /> once the visitor accepts cookies, like
// GA4; calls made before it loads (or without consent) wait on a stub and are only sent if
// the tracker arrives. Anonymous: no names, emails or payment details, ever.
//
// The shop funnel: add_to_basket → basket_view → checkout_start → purchase, per funnel
// ('training' or 'policies').

type Fi = ((type: string, props?: Record<string, unknown>) => void) & { q?: unknown[][] }

export function fi(type: string, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try {
    const w = window as unknown as { fi?: Fi }
    if (!w.fi) {
      const stub = ((...a: unknown[]) => { (stub.q = stub.q || []).push(a) }) as Fi
      w.fi = stub
    }
    w.fi(type, props)
  } catch { /* analytics must never break the shop */ }
}

/** Where this visit came from (anonymous session id, source, utm_campaign, Google click flag),
 *  sent with a checkout so the sale can be credited to the ad campaign that brought it. */
export function fiAttribution(): { session: string; source: string; campaign: string; gclid: boolean } | null {
  if (typeof window === 'undefined') return null
  try {
    const w = window as unknown as { fi?: { attribution?: () => any } }
    const a = w.fi?.attribution?.()
    return a && typeof a.session === 'string' ? a : null
  } catch { return null }
}

/** An answer to one of the on-site questions (the exit question, the thank-you question), sent to
 *  Funnel Insights › Feedback. Anonymous: the visit's session id, the page and the answer. */
export function fiFeedback(f: { kind: 'exit' | 'almost_stopped' | 'trigger'; choice?: string; answer?: string; product?: string; funnel?: string }) {
  if (typeof window === 'undefined') return
  try {
    const a = fiAttribution()
    const body = JSON.stringify({ site: 'carestream', ...f, page: location.pathname, session: a?.session })
    fetch('https://trg-funnel-insights.vercel.app/api/feedback', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
  } catch { /* feedback must never break the page */ }
}
