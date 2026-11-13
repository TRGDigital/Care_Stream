'use client'

import { useEffect, useState } from 'react'
import { getPlatformToken, createPlatformClient } from '@/lib/platform-api'

// Platform draft preview of the related-content block. The public block only lists published pages;
// here the platform lists everything in the cluster, drafts included, using the same rules: the
// cluster's collections first (up to 3), then the newest posts, at most 10 links in total.
const CAP = 10
interface Item { title: string; url: string; draft: boolean }

export function RelatedContentPreview({ cluster, exclude }: { cluster?: string | null; exclude: string }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [total, setTotal] = useState(0)
  useEffect(() => {
    const token = getPlatformToken()
    if (!cluster || !token) return
    const api = createPlatformClient(token)
    Promise.all([api.blog.posts(), api.collections.list()]).then(([b, c]) => {
      const col = c.collections.filter(x => x.topic_cluster === cluster && x.slug !== exclude && x.status !== 'archived')
      const posts = b.posts.filter(x => x.topic_cluster === cluster && x.slug !== exclude && x.status !== 'archived')
        .sort((a, z) => String(z.publication_date ?? z.created_at).localeCompare(String(a.publication_date ?? a.created_at)))
      const all: Item[] = [
        ...col.slice(0, 3).map(x => ({ title: x.title, url: `/collection/${x.slug}`, draft: x.status !== 'published' })),
        ...posts.map(x => ({ title: x.title, url: `/blog/${x.slug}`, draft: x.status !== 'published' })),
        ...col.slice(3).map(x => ({ title: x.title, url: `/collection/${x.slug}`, draft: x.status !== 'published' })),
      ]
      setTotal(all.length); setItems(all.length > CAP ? all.slice(0, CAP - 1) : all)
    }).catch(() => setItems([]))
  }, [cluster, exclude])
  if (!cluster || !items || items.length === 0) return null
  const label = cluster.replace(/-/g, ' ')
  return (
    <aside aria-label={`More about ${label}`} style={{ padding: '40px 0' }}>
      <div style={{ maxWidth: 768, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, background: '#F9FAFB' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Part of our {label} guides</h2>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>Preview: lists drafts too. The public block lists published pages only, {Math.min(total, CAP)} of {total} links shown.</p>
          <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {items.map(i => (
              <li key={i.url} style={{ fontSize: 14 }}>
                <a href={i.url} style={{ color: '#0f766e' }}>{i.title}</a>
                {i.draft && <span style={{ marginLeft: 8, background: '#FEF3C7', color: '#78350F', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>draft</span>}
              </li>
            ))}
            {total > CAP && <li style={{ fontSize: 14, fontWeight: 600 }}>See all {total} guides</li>}
          </ul>
        </div>
      </div>
    </aside>
  )
}
