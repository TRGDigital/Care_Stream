import Link from 'next/link'

// "Part of our ... guides": the other published pages in the same topic cluster, generated from the
// database so every new post or collection appears on its siblings without anyone republishing.
// Rendered on the server so the links are in the HTML. The API caps it at 10 links in total; when
// the cluster is bigger, the last link goes to the cluster hub.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Item { title: string; url: string; kind: 'post' | 'collection' }
interface Data { cluster: { key: string; label: string; intro: string }; items: Item[]; total: number; hub_url: string | null }

export async function RelatedContent({ cluster, exclude }: { cluster?: string | null; exclude: string }) {
  if (!cluster) return null
  let data: Data | null = null
  try {
    const res = await fetch(`${API_URL}/public/blog/cluster/${encodeURIComponent(cluster)}?exclude=${encodeURIComponent(exclude)}`, { next: { revalidate: 300 } })
    if (res.ok) data = (await res.json())?.data ?? null
  } catch { /* the block is optional */ }
  if (!data || data.items.length === 0) return null
  const { label, intro } = data.cluster
  return (
    <aside aria-label={`More about ${label}`} className="bg-white py-10">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-xl border border-gray-200 bg-neutral-light/40 p-6">
          <h2 className="text-xl font-bold text-neutral-dark">Part of our {label} guides</h2>
          {intro && <p className="mt-2 text-sm text-neutral-mid">{intro}</p>}
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {data.items.map(i => (
              <li key={i.url} className="text-sm">
                <Link href={i.url} className="text-teal hover:underline">{i.title}</Link>
              </li>
            ))}
            {data.hub_url && (
              <li className="text-sm font-semibold">
                <Link href={data.hub_url} className="text-neutral-dark hover:text-teal">See all {data.total} {label} guides</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  )
}
