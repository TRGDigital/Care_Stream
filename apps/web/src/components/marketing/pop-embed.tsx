'use client'

import { useEffect } from 'react'

/**
 * TRG Digital lead-capture pop (the "Care Readiness Report" gamified quiz).
 *
 * Loads the embed from trgdigital.co.uk on the marketing site. For real
 * visitors the pop only appears once the overlay is enabled in
 * /admin/websites and its trigger (exit-intent / scroll) fires.
 *
 * To TEST before going live: visit any marketing page with ?poptest=1 (e.g.
 * https://www.carestreamai.com/?poptest=1). That sets data-preview="1", which
 * makes embed.js render the pop immediately on load, bypassing the
 * enabled-check and the triggers. Without that flag, nothing shows while the
 * overlay is disabled, so normal visitors are unaffected.
 */
export function PopEmbed() {
  useEffect(() => {
    if (document.querySelector('script[data-trg-pop]')) return
    const preview = new URLSearchParams(window.location.search).has('poptest')
    const s = document.createElement('script')
    s.src = 'https://www.trgdigital.co.uk/embed.js'
    s.defer = true
    s.setAttribute('data-site', 'carestreamai')
    s.setAttribute('data-trg-pop', '1')
    if (preview) s.setAttribute('data-preview', '1')
    document.body.appendChild(s)
  }, [])
  return null
}
