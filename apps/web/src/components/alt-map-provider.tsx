'use client'

import { createContext, useContext } from 'react'

// Holds the central image alt-text map (src → alt). Fed by a server layout that
// fetches it once, so the value is present during SSR (alt lands in the HTML for
// SEO) and is then available to any client component below it.
const AltMapContext = createContext<Record<string, string>>({})

export function AltMapProvider({ map, children }: { map: Record<string, string>; children: React.ReactNode }) {
  return <AltMapContext.Provider value={map}>{children}</AltMapContext.Provider>
}

export function useImageAlt(src: string, fallback = ''): string {
  const map = useContext(AltMapContext)
  return map[src] || fallback
}
