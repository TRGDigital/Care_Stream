import { ServicePageV2, type ServicePage } from './service-page-v2'
import { previewParam } from '@/lib/preview'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fetches one /our-services page and renders it in the rebuilt design.
//
// Split out so each of the seven routes adds three lines rather than repeating the fetch, the
// preview handling and the fallback. Returns null when there is no published row, and the
// caller then renders the current page unchanged: a page must never go blank because content
// has not been imported yet.
export async function loadServicePage(slug: string) {
  try {
    // In preview the token asks the API for the draft, and the response must not be cached: a
    // cached draft would be served to the next visitor asking for the published page.
    const q = await previewParam()
    const res = await fetch(`${API_URL}/public/service-pages/${slug}${q}`,
      q ? { cache: 'no-store' } : { next: { revalidate: 60 } })
    if (!res.ok) return null
    return ((await res.json())?.data?.page ?? null) as ServicePage | null
  } catch {
    return null
  }
}

/** The rebuilt page, or null if there is nothing published to render. */
export async function ServicePageIfPublished({ slug }: { slug: string }) {
  const page = await loadServicePage(slug)
  if (!page?.content?.blocks?.length) return null
  return <ServicePageV2 page={page} />
}
