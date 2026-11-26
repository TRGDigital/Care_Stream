'use client'

// Counts every public page view, for everyone, whether or not they accepted cookies. It stores NOTHING on the device (no cookie, no local or session
// storage, no visitor id) and sends only the page, where the visit came from (a campaign name or the referring site) and, on the server, the device type
// taken from the request. No IP address is kept. The detailed behaviour tracker (site-tracker.tsx) stays consent only; this is the plain head count.
// Shown at /platform/site-activity as "every visitor".
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const PRIVATE_FIRST = new Set(['platform', 'admin', 'api', 'chat', 'dashboard', 'login', 'staff', 'billing', 'settings', 'family', 'auth', 'onboarding'])
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|gtmetrix|monitor|uptime/i

let first = true            // module memory only: nothing is written anywhere
let last = ''

export function PageCounter() {
  const pathname = usePathname() ?? ''
  useEffect(() => {
    try {
      if (!pathname || pathname === last) return
      last = pathname
      if (PRIVATE_FIRST.has((pathname.split('/').filter(Boolean)[0] ?? '').toLowerCase())) return
      if (typeof navigator === 'undefined' || (navigator as any).webdriver === true || BOT.test(navigator.userAgent)) return
      // Where the visit came from is only known on the first page of a visit; later pages are inside the site.
      const q = first ? new URLSearchParams(window.location.search) : null
      const body = JSON.stringify({ path: pathname, referrer: first ? document.referrer : '', utm_source: q?.get('utm_source') ?? '' })
      first = false
      fetch(`${API_URL}/public/page-count`, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
    } catch { /* never breaks the page */ }
  }, [pathname])
  return null
}
