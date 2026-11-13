import { relatedBlockHtml, type RelatedBlock } from '@/lib/related-block'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** The related-content block HTML for a page in a topic cluster, or '' when there is nothing to show.
 *  Capped at 10 links by the API. A signed preview token also lists the cluster's drafts. */
export async function relatedData(cluster: string | null | undefined, exclude: string, preview?: string, limit = 10): Promise<RelatedBlock | null> {
  if (!cluster) return null
  try {
    const url = `${API_URL}/public/blog/cluster/${encodeURIComponent(cluster)}?exclude=${encodeURIComponent(exclude)}&limit=${limit}${preview ? `&preview=${encodeURIComponent(preview)}` : ''}`
    const res = await fetch(url, preview ? { cache: 'no-store' } : { next: { revalidate: 300 } })
    if (!res.ok) return null
    const d = (await res.json())?.data
    if (!d?.items?.length) return null
    return { label: d.cluster.label, intro: d.cluster.intro, items: d.items, total: d.total, hub_url: d.hub_url }
  } catch { return null }
}

export async function relatedHtml(cluster: string | null | undefined, exclude: string, preview?: string, limit = 10): Promise<string> {
  const b = await relatedData(cluster, exclude, preview, limit)
  return b ? relatedBlockHtml(b) : ''
}
