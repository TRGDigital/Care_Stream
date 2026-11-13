import { relatedBlockHtml, type RelatedBlock } from '@/lib/related-block'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** The related-content block HTML for a page in a topic cluster, or '' when there is nothing to show.
 *  Capped at 10 links by the API. A signed preview token also lists the cluster's drafts. */
export async function relatedHtml(cluster: string | null | undefined, exclude: string, preview?: string): Promise<string> {
  if (!cluster) return ''
  try {
    const url = `${API_URL}/public/blog/cluster/${encodeURIComponent(cluster)}?exclude=${encodeURIComponent(exclude)}${preview ? `&preview=${encodeURIComponent(preview)}` : ''}`
    const res = await fetch(url, preview ? { cache: 'no-store' } : { next: { revalidate: 300 } })
    if (!res.ok) return ''
    const d = (await res.json())?.data
    if (!d?.items?.length) return ''
    const b: RelatedBlock = { label: d.cluster.label, intro: d.cluster.intro, items: d.items, total: d.total, hub_url: d.hub_url }
    return relatedBlockHtml(b)
  } catch { return '' }
}
