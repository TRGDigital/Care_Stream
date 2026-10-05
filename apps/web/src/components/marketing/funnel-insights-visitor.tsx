'use client'

import { useEffect } from 'react'
import { CONSENT_EVENT, hasAnalyticsConsent } from './cookie-consent'

// Returning visitors for Funnel Insights › Ads ("Came back after an ad"): once a visitor has
// accepted cookies, the tracker keeps a random visitor id in localStorage ('fi-visitor') so a
// later visit (a search for our name days after an ad click) can be tied to the first. Without
// consent nothing is stored, and declining removes it. Cookie Policy section 4.5.
type FiApi = { remember?: () => unknown; forget?: () => void }

function withTracker(run: (f: FiApi) => void, tries = 20) {
  const f = (window as unknown as { fi?: FiApi }).fi
  if (f?.remember) run(f)
  else if (tries > 0) setTimeout(() => withTracker(run, tries - 1), 500)
}

export function FunnelInsightsVisitor() {
  useEffect(() => {
    const sync = () => withTracker(f => (hasAnalyticsConsent() ? f.remember?.() : f.forget?.()))
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])
  return null
}
