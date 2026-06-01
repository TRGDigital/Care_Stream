'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Microsoft Clarity project id. Set NEXT_PUBLIC_CLARITY_ID in the web project's
// environment variables. Without it, consent is still recorded but nothing loads.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID
const STORAGE_KEY = 'cookie_consent'

function loadClarity() {
  if (!CLARITY_ID || typeof window === 'undefined') return
  if ((window as any).clarity) return // already loaded
  ;(function (c: any, l: any, a: any, r: any, i: string) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    const t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
    const y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', CLARITY_ID)
}

function getConsent(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getConsent()
    if (consent === 'accepted') loadClarity()
    else if (consent !== 'declined') setVisible(true)

    // Lets a future footer "Cookie settings" link re-open the banner.
    const reopen = () => setVisible(true)
    window.addEventListener('open-cookie-consent', reopen)
    return () => window.removeEventListener('open-cookie-consent', reopen)
  }, [])

  const choose = (value: 'accepted' | 'declined') => {
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}
    if (value === 'accepted') loadClarity()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-elevated ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-neutral-mid">
          We use cookies to understand how visitors use our site so we can improve it. You can accept or decline.{' '}
          <Link href="/cookies" className="font-medium text-teal underline">Cookie Policy</Link>.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-btn border-2 border-gray-200 px-5 py-2.5 text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-btn bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
