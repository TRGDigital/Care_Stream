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
      const targetY = () => Math.max(0, target.getBoundingClientRect().top + window.scrollY - 92)
      window.scrollTo({ top: targetY(), behavior: 'smooth' })
      // Images further up the page can finish loading while a long smooth scroll runs and shift the target, so check
      // again after the scroll and correct any drift before putting the cursor in the box.
      let tries = 0
      const settle = () => {
        const drift = targetY() - window.scrollY
        if (Math.abs(drift) > 8 && tries++ < 4) { window.scrollTo({ top: targetY(), behavior: 'instant' as ScrollBehavior }); window.setTimeout(settle, 250) }
        else el.focus({ preventScroll: true })
      }
      window.setTimeout(settle, 900)
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
