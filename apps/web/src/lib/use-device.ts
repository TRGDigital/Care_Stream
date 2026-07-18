'use client'

import { useEffect, useState } from 'react'

// True on phones and tablets (touch-first devices), including iPadOS which reports
// as desktop Safari. Computed after mount so it never mismatches SSR.
export function useIsMobileOrTablet(): boolean {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const coarse  = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const ua      = /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle|PlayBook/i.test(navigator.userAgent)
    const ipadOS  = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
    setIs(coarse || ua || ipadOS)
  }, [])
  return is
}
