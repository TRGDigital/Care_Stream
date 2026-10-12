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

// The training images (module illustrations and lesson pictures served by the API) make up about
// 700 of the map's entries and about 150 KB. Sending all of them inside every page made the
// course pages several hundred KB heavier than they needed to be (it was sent twice: the root and
// the marketing layout each had a provider). The layouts now send the site's own images only, and
// a page that shows training images adds just the ones its data refers to (AltScope).
const TRAINING_IMAGE = '/public/training/image/'
const TRAINING_IMAGE_RE = /\/public\/training\/image\/[^"'\s?#\\]+/g

/** The map without the training images: what the layouts send to every page. */
export function siteAlts(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).filter(([src]) => !src.includes(TRAINING_IMAGE)))
}

/** The training image entries whose image appears anywhere in `data` (a module record, a demo,
 *  a list of topics...), matched on the image path so a relative or absolute URL both count. */
export function trainingAltsFor(map: Record<string, string>, data: unknown): Record<string, string> {
  let json = ''
  try { json = JSON.stringify(data ?? null) } catch { return {} }
  const paths = new Set(json.match(TRAINING_IMAGE_RE) ?? [])
  if (!paths.size) return {}
  const out: Record<string, string> = {}
  for (const [src, alt] of Object.entries(map)) {
    const i = src.indexOf(TRAINING_IMAGE)
    if (i >= 0 && paths.has(src.slice(i))) out[src] = alt
  }
  return out
}
