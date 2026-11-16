'use client'

import { useEffect } from 'react'
import { CONSENT_EVENT, hasAnalyticsConsent } from './cookie-consent'

// Remembers, in the visitor's own browser, when they first visited and how many separate visits they have made, so a new account can show
// "3 visits over 2 days before signing up". It runs ONLY after the visitor has accepted cookies (the same gate as analytics): decline, and nothing
// is stored. The values only leave the browser if the person goes on to create an account, when the register page sends them with the sign up.
//
// Stored: localStorage `cs_visits` = { first_at (ms), first_landing (path, no query string), visits }, and a per-tab-session flag so one visit counts once.
// If cookies are accepted part way through a visit, "first landing" is the page where they accepted.
export const VISITS_KEY = 'cs_visits'

export type VisitRecord = { first_at: number; first_landing: string; visits: number }

export function readVisits(): VisitRecord | null {
  try {
    const raw = localStorage.getItem(VISITS_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return typeof v?.first_at === 'number' && typeof v?.visits === 'number' ? v : null
  } catch { return null }
}

export function VisitTracker() {
  useEffect(() => {
    const run = () => {
      if (!hasAnalyticsConsent()) return
      try {
        const v: VisitRecord = readVisits() ?? { first_at: Date.now(), first_landing: window.location.pathname.slice(0, 200), visits: 0 }
        if (!sessionStorage.getItem('cs_visit_counted')) {
          v.visits = Math.min(v.visits + 1, 1000)
          sessionStorage.setItem('cs_visit_counted', '1')
        }
        localStorage.setItem(VISITS_KEY, JSON.stringify(v))
      } catch { /* storage blocked: nothing is recorded */ }
    }
    run()
    window.addEventListener(CONSENT_EVENT, run)
    return () => window.removeEventListener(CONSENT_EVENT, run)
  }, [])
  return null
}
