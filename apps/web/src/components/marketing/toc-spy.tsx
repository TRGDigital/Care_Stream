'use client'

import { useEffect } from 'react'

// The on-page nav on /how-it-works and the service pages, lit the way the theme's script lights
// it: the link for the section at the reading line (200px below the top of the viewport) gets
// `on`. A clicked link is lit at once and stays lit while the page travels to its section; the
// scroll position takes over again once it arrives, or as soon as the visitor scrolls themselves.
export function TocSpy({ nav }: { nav: string }) {
  useEffect(() => {
    const navEl = document.querySelector<HTMLElement>(nav)
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(`${nav} a[href^="#"]`))
    if (!navEl || !links.length) return
    const sections = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))))

    const light = (i: number) => links.forEach((a, j) => {
      a.classList.toggle('on', j === i)
      if (j === i) a.setAttribute('aria-current', 'location')
      else a.removeAttribute('aria-current')
    })
    const measure = () => {
      const y = window.scrollY + 200
      let cur = 0
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top + window.scrollY <= y) cur = i })
      light(cur)
    }

    // Where a section should land: below the site header and, while it is pinned, this nav.
    const landing = (el: HTMLElement) => {
      const header = document.querySelector<HTMLElement>('#hdr')
      const headerH = header ? header.getBoundingClientRect().height : 68
      const navH = getComputedStyle(navEl).position === 'sticky' ? navEl.getBoundingClientRect().height : 0
      return Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerH - navH - 12)
    }

    let pinnedTo: number | null = null
    let pinnedEl: HTMLElement | null = null
    let corrections = 0
    let backstop: ReturnType<typeof setTimeout> | undefined
    // After arriving, images further up can still finish loading and push the section down the
    // page. For two seconds, any change in page height puts it back where it was sent.
    let settleEl: HTMLElement | null = null
    let settleUntil = 0
    let clickedAt = 0
    const settle = new ResizeObserver(() => {
      // Still travelling: aim again at where the section now is.
      if (pinnedEl) { go(landing(pinnedEl)); return }
      if (!settleEl || Date.now() > settleUntil) { settleEl = null; return }
      const want = landing(settleEl)
      if (Math.abs(want - window.scrollY) > 8) window.scrollTo({ top: want, behavior: 'auto' })
      // Keep watching while the page is still changing, up to six seconds after the click.
      settleUntil = Math.min(Date.now() + 1200, clickedAt + 6000)
    })
    settle.observe(document.body)
    const unpin = () => { pinnedTo = null; pinnedEl = null; clearTimeout(backstop); measure() }
    const arrive = () => {
      settleEl = pinnedEl
      settleUntil = Date.now() + 2000
      unpin()
    }
    const go = (top: number) => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      pinnedTo = top
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    }

    const onScroll = () => {
      if (pinnedTo === null) { measure(); return }
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (Math.abs(window.scrollY - Math.min(pinnedTo, max)) >= 4) return
      // Arrived at the spot worked out on the click. Images above may have loaded on the way and
      // pushed the section down, so check it is really there and go again if not.
      const want = pinnedEl ? landing(pinnedEl) : pinnedTo
      if (pinnedEl && Math.abs(Math.min(want, max) - window.scrollY) > 8 && corrections < 3) {
        corrections++
        go(want)
        return
      }
      arrive()
    }
    // A resize re-lights by position only when no click is being honoured.
    const onResize = () => { if (pinnedTo === null) measure() }
    // Any scrolling the visitor does themselves ends the pin straight away.
    const onUserScroll = () => { settleEl = null; if (pinnedTo !== null) unpin() }

    const onClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      const i = links.indexOf(e.currentTarget as HTMLAnchorElement)
      const target = sections[i]
      if (i < 0 || !target) return
      e.preventDefault()
      light(i)
      clickedAt = Date.now()
      // The images between here and the section load lazily as they come into view, and each one
      // that arrives pushes the section further down. Start them all now.
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(img => { img.loading = 'eager' })
      pinnedEl = target
      corrections = 0
      clearTimeout(backstop)
      backstop = setTimeout(unpin, 6000)
      history.replaceState(null, '', links[i].hash)
      go(landing(target))
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Keep the chosen pill in view when the row scrolls sideways on a narrow screen. Only the
      // row moves: scrollIntoView would also scroll the page and cancel the travel just started.
      const row = links[i].parentElement
      if (row && row.scrollWidth > row.clientWidth) {
        const a = links[i]
        const left = a.offsetLeft - (row.clientWidth - a.offsetWidth) / 2
        row.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
      }
    }

    links.forEach(a => a.addEventListener('click', onClick))
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize, { passive: true })
    addEventListener('wheel', onUserScroll, { passive: true })
    addEventListener('touchmove', onUserScroll, { passive: true })
    addEventListener('keydown', onUserScroll)
    measure()
    return () => {
      settle.disconnect()
      clearTimeout(backstop)
      links.forEach(a => a.removeEventListener('click', onClick))
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onResize)
      removeEventListener('wheel', onUserScroll)
      removeEventListener('touchmove', onUserScroll)
      removeEventListener('keydown', onUserScroll)
    }
  }, [nav])
  return null
}
