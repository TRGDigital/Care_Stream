'use client'

import { useEffect } from 'react'

// Registers the service worker (needed for installability + web-push). Mounted once
// inside the portal/admin shells. Safe to call repeatedly — the browser dedupes.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore — push/install simply won't be available */ })
  }, [])
  return null
}
