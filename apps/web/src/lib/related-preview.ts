import { createPlatformClient } from '@/lib/platform-api'
import { relatedBlockHtml, type RelatedItem } from '@/lib/related-block'

// Platform draft preview of the related-content block: the same rules as the public block (the cluster's
// collections first, up to 3, then the newest posts, at most 10 links in total), but listing drafts too.
const CAP = 10
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function previewRelatedHtml(token: string, cluster: string | null | undefined, exclude: string): Promise<string> {
  if (!cluster) return ''
  const api = createPlatformClient(token)
  const [b, c, info] = await Promise.all([
    api.blog.posts(), api.collections.list(),
    fetch(`${API_URL}/public/blog/cluster/${encodeURIComponent(cluster)}?exclude=none`).then(r => r.json()).catch(() => null),
  ])
  const col = c.collections.filter(x => x.topic_cluster === cluster && x.slug !== exclude && x.status !== 'archived')
  const posts = b.posts.filter(x => x.topic_cluster === cluster && x.slug !== exclude && x.status !== 'archived')
    .sort((a, z) => String(z.publication_date ?? z.created_at).localeCompare(String(a.publication_date ?? a.created_at)))
  const all: RelatedItem[] = [
    ...col.slice(0, 3).map(x => ({ title: x.title, url: `/collection/${x.slug}`, draft: x.status !== 'published' })),
    ...posts.map(x => ({ title: x.title, url: `/blog/${x.slug}`, draft: x.status !== 'published' })),
    ...col.slice(3).map(x => ({ title: x.title, url: `/collection/${x.slug}`, draft: x.status !== 'published' })),
  ]
  const more = all.length > CAP
  const label = info?.data?.cluster?.label ?? cluster.replace(/-/g, ' ')
  return relatedBlockHtml({
    label, intro: info?.data?.cluster?.intro ?? '', items: more ? all.slice(0, CAP - 1) : all, total: all.length,
    hub_url: more ? `/topics/${cluster}` : null,
  })
}
