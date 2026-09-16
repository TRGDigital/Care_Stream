import { claimSafe } from '@/lib/training-commerce'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Server-side fetch of the central alt-text map (managed in the platform console).
// Cached/deduped by Next; revalidates every 60s.
export async function getSiteAltMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_URL}/public/image-alts`, { next: { revalidate: 60 } })
    if (!res.ok) return {}
    const body = await res.json()
    // The map goes into every page (it is passed to a client provider, so it is in the page
    // source even where an image is not shown), so a claim not yet held is removed here.
    const alts = (body?.data?.alts ?? {}) as Record<string, string>
    return Object.fromEntries(Object.entries(alts).map(([src, alt]) => [src, claimSafe(alt)]))
  } catch {
    return {}
  }
}
