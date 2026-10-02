'use client'

import { useEffect, useState } from 'react'

// A checkout field remembered for this browser tab (sessionStorage), so someone who goes on to
// Stripe and presses its back arrow finds their email (and company, name) still filled in. Gone
// when the tab closes; nothing leaves the browser.
export function useRemembered(key: string, initial = ''): [string, (v: string) => void] {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    try { const v = sessionStorage.getItem(`cs_field_${key}`); if (v) setValue(v) } catch { /* blocked */ }
  }, [key])
  const set = (v: string) => {
    setValue(v)
    try { if (v) sessionStorage.setItem(`cs_field_${key}`, v); else sessionStorage.removeItem(`cs_field_${key}`) } catch { /* blocked */ }
  }
  return [value, set]
}
