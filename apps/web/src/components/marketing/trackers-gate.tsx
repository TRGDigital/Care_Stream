'use client'

import { usePathname } from 'next/navigation'

// Pages that must never be seen by analytics, visit tracking or session recording: the private family form for "This is me"
// (the link's secret token is in the address and the page shows what families type about a resident).
const PRIVATE_PREFIXES = ['/family/']

export function TrackersGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  if (PRIVATE_PREFIXES.some(p => pathname.startsWith(p))) return null
  return <>{children}</>
}
