import Link from 'next/link'
import { PageHero } from '@/components/marketing/ui'

// Database-driven: posts are managed in the platform admin and served from the
// public blog API. ISR keeps the page fast and SEO-friendly while staying current.
export const revalidate = 60

export const metadata = {
  title: 'Blog',
  description: 'Insights, regulatory guidance, and practical resources for UK care professionals. Covering CQC compliance, workforce management, AI in care, and more.',
  openGraph: {
    title: 'CareStreamAI Blog',
    description: 'Regulatory guidance and practical resources for everyone working in UK health and social care.',
    url: 'https://carestreamai.com/blog',
  },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const CATEGORY_COLORS: Record<string, string> = {
  'CQC & Compliance':     'bg-teal-light text-teal',
  'Regulatory Knowledge': 'bg-amber-50 text-amber-brand',
  'Workforce':            'bg-green-50 text-green-700',
  'Technology':           'bg-purple-50 text-purple-700',
  'Registered Manager':   'bg-neutral-light text-neutral-mid',
}
const colorFor = (cat: string) => CATEGORY_COLORS[cat] ?? 'bg-teal-light text-teal'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface ListedPost {
  slug: string
  title: string
  excerpt: string | null
  category: string
  publication_date: string | null
  read_time_minutes: number
  is_featured: boolean
  feature_image_url: string | null
}

async function getPosts(): Promise<ListedPost[]> {
  try {
    const res = await fetch(`${API_URL}/public/blog/posts`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const body = await res.json()
    return (body?.data?.posts ?? []) as ListedPost[]
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <>
      <PageHero
        label="Blog"
        title="Insight for UK care professionals."
        subtitle="Regulatory guidance, workforce insight, and practical resources for everyone working in UK health and social care."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          {posts.length === 0 ? (
            <p className="text-center text-sm text-neutral-mid">No posts published yet. Check back soon.</p>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {posts.map(post => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"
                >
                  {post.feature_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.feature_image_url}
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <span className={`rounded-pill px-3 py-1 text-xs font-bold ${colorFor(post.category)}`}>{post.category}</span>
                    <span className="text-xs text-gray-400">{post.read_time_minutes} min read</span>
                  </div>
                  <h2 className="mb-4 flex-1 font-extrabold leading-snug text-neutral-dark group-hover:text-teal transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && <p className="mb-6 text-sm leading-relaxed text-neutral-mid">{post.excerpt}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(post.publication_date)}</span>
                    <span className="font-semibold text-teal group-hover:underline">Read →</span>
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
