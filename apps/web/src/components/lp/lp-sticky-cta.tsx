'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { track } from '@/lib/lp/tracker'

// Mobile-only sticky CTA that slides in after the hero. Dismissible (7-day cookie).
export function LpStickyCta({ pageId, label, anchor }: { pageId: string; label: string; anchor: string }) {
  const [show, setShow] = useState(false)
  const cookieName = `lp_cta_dismissed_${pageId}`

  useEffect(() => {
    if (document.cookie.includes(`${cookieName}=1`)) return
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [cookieName])

  function dismiss() {
    setShow(false)
    document.cookie = `${cookieName}=1; max-age=${7 * 24 * 60 * 60}; path=/`
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <a
          href={anchor}
          onClick={() => track('cta_click', null, { source: 'sticky' })}
          className="btn-amber flex-1 rounded-btn py-3 text-center text-sm"
        >
          {label}
        </a>
        <button type="button" aria-label="Dismiss" onClick={dismiss} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-neutral-mid hover:bg-neutral-light">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
