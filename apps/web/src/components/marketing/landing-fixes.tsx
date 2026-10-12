'use client'

import { useEffect } from 'react'
import { LF_DEMO_ALLOWED } from '@/lib/landing-fixes'
import './landing-fixes.css'

// ?lfdemo=1 puts .lfdemo on <html> for the visit (kept in window memory only, no cookie or
// storage), which turns on the yellow review highlight of the landing fixes (lib/landing-fixes.ts).
// Does nothing on production.
type W = Window & { __csLfDemo?: boolean }

export function LandingFixesRoot() {
  useEffect(() => {
    if (!LF_DEMO_ALLOWED) return
    const w = window as W
    const q = new URLSearchParams(location.search)
    if (q.get('lfdemo') === '1') w.__csLfDemo = true
    if (q.get('lfdemo') === '0') w.__csLfDemo = false
    document.documentElement.classList.toggle('lfdemo', !!w.__csLfDemo)
  }, [])
  return null
}
