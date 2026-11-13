import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

// The hub the related-content block links to when a cluster has more pages than fit in ten links.
export const revalidate = 300
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Data { cluster: { key: string; label: string; intro: string }; items: { title: string; url: string; kind: string }[] }

async function load(cluster: string): Promise<Data | null> {
  try {
    const res = await fetch(`${API_URL}/public/blog/cluster/${encodeURIComponent(cluster)}/all`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const d = (await res.json())?.data as Data | undefined
    return d && d.items.length ? d : null
  } catch { return null }
}

export async function generateMetadata({ params }: { params: Promise<{ cluster: string }> }): Promise<Metadata> {
  const d = await load((await params).cluster)
  if (!d) return { title: 'Not found' }
  return { title: `${d.cluster.label} guides | CareStream`, description: d.cluster.intro || undefined }
}

export default async function TopicHub({ params }: { params: Promise<{ cluster: string }> }) {
  const d = await load((await params).cluster)
  if (!d) notFound()
  const collections = d.items.filter(i => i.kind === 'collection')
  const posts = d.items.filter(i => i.kind === 'post')
  const group = (title: string, list: typeof d.items) => list.length > 0 && (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-neutral-dark">{title}</h2>
      <ul className="mt-3 space-y-2">
        {list.map(i => <li key={i.url}><Link href={i.url} className="text-teal hover:underline">{i.title}</Link></li>)}
      </ul>
    </section>
  )
  return (
    <main className="bg-white py-14">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-dark">{d.cluster.label} guides</h1>
        {d.cluster.intro && <p className="mt-3 text-neutral-mid">{d.cluster.intro}</p>}
        {group('Tools and collections', collections)}
        {group('Guides', posts)}
      </div>
    </main>
  )
}
