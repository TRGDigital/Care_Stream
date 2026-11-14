'use client'

import { useEffect } from 'react'

// A "Search" button that links to #<id> scrolls there, and this puts the cursor in the search box, so a visitor can
// start typing straight away. Works for a click on any link to that anchor and for opening the page with the hash.
export function FocusOnHash({ id }: { id: string }) {
  useEffect(() => {
    const go = () => {
      const el = document.getElementById(id) as HTMLElement | null
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => el.focus({ preventScroll: true }), 450)
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (a && (a.getAttribute('href') === `#${id}` || a.getAttribute('href')?.endsWith(`#${id}`)) && a.pathname === window.location.pathname) { e.preventDefault(); go() }
    }
    if (window.location.hash === `#${id}`) window.setTimeout(go, 300)
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [id])
  return null
}
