import Script from 'next/script'

// Funnel Insights (trg-funnel-insights.vercel.app): anonymous measurement of how the public
// pages and the two shops are used. Runs for every visitor on the marketing and /go/ pages
// only, never inside the signed-in app, in "memory" mode: nothing is written to the browser
// (the ids live in the page's memory), and ?fi_optout=1 switches it off. Explained in
// section 4.5 of the Cookie Policy and in the Privacy Policy. With cookie consent only, it also
// remembers a returning visitor (funnel-insights-visitor.tsx).
export function FunnelInsightsTracker() {
  return <Script src="https://trg-funnel-insights.vercel.app/t.js" data-site="carestream" data-storage="memory" strategy="afterInteractive" />
}
