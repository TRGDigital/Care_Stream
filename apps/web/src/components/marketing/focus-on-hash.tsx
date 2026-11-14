'use client'

import { useEffect } from 'react'

// A "Search" button that links to #<id> scrolls there, and this puts the cursor in the search box, so a visitor can
// start typing straight away. It takes over the click (before the site's own link handling) so the position is the
// same every time: the section named by `scrollTo` (default: the box itself) sits just under the top bar.
export function FocusOnHash({ id, scrollTo }: { id: string; scrollTo?: string }) {
  useEffect(() => {
    const go = () => {
      const el = document.getElementById(id) as HTMLElement | null
      const target = document.getElementById(scrollTo ?? id) ?? el
      if (!el || !target) return
      const y = target.getBoundingClientRect().top + window.scrollY - 92
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      window.setTimeout(() => el.focus({ preventScroll: true }), 600)
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      const href = a?.getAttribute('href') ?? ''
      if (a && (href === `#${id}` || href.endsWith(`#${id}`)) && a.pathname === window.location.pathname) {
        // No history change: the router scrolls to a hash itself, which would override this position.
        e.preventDefault(); e.stopPropagation(); go()
      }
    }
    if (window.location.hash === `#${id}`) window.setTimeout(go, 300)
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [id, scrollTo])
  return null
}
