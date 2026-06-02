import type { Metadata } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface MetaFallback {
  title: string
  description: string
}

// Build page metadata from the site_pages database record for `path`, managed in
// the platform "Pages" tab. Falls back to the supplied code values if the record
// is missing, unpublished, or the API is unreachable — so pages always have meta.
// Revalidates every 60s, so edits in the Pages tab go live without a redeploy.
export async function pageMetadata(path: string, fallback: MetaFallback): Promise<Metadata> {
  let title = fallback.title
  let description = fallback.description
  let ogTitle: string | undefined
  let ogDescription: string | undefined
  let ogImage: string | undefined

  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const body = await res.json()
      const p = body?.data?.page
      if (p) {
        if (p.title) title = p.title
        if (p.description) description = p.description
        ogTitle = p.og_title || undefined
        ogDescription = p.og_description || undefined
        ogImage = p.og_image_url || undefined
      }
    }
  } catch {
    // Network or API error — keep the code fallback values.
  }

  return {
    // absolute: the stored title already includes the brand suffix, so do not append the template.
    title: { absolute: title },
    description,
    openGraph: {
      title: ogTitle || title,
      description: ogDescription || description,
      url: `https://carestreamai.com${path}`,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}
