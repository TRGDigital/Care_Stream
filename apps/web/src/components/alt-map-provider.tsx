'use client'

import { createContext, useContext, useMemo } from 'react'

// Holds the central image alt-text map (src → alt). Fed by a server layout that
// fetches it once, so the value is present during SSR (alt lands in the HTML for
// SEO) and is then available to any client component below it.
//
// The map travels in the page's RSC payload, so it is shipped to every visitor. The layouts pass
// only the site's own images (about 60 entries); the training images (about 700) are added by
// the pages that show them, through AltScope (alt-scope.tsx), which nests a provider here with
// just those images. A nested provider adds to the one above it rather than replacing it.
const AltMapContext = createContext<Record<string, string>>({})

export function AltMapProvider({ map, children }: { map: Record<string, string>; children: React.ReactNode }) {
  const parent = useContext(AltMapContext)
  const value = useMemo(() => (Object.keys(parent).length ? { ...parent, ...map } : map), [parent, map])
  return <AltMapContext.Provider value={value}>{children}</AltMapContext.Provider>
}

export function useImageAlt(src: string, fallback = ''): string {
  const map = useContext(AltMapContext)
  return map[src] || fallback
}
