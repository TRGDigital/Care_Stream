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
