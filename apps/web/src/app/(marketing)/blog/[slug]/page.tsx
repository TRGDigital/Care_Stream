import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/marketing/article-layout'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Faq { question: string; answer: string }
interface Post {
  slug: string
  title: string
  excerpt: string | null
  content: string
  category: string
  publication_date: string | null
  read_time_minutes: number
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  feature_image_url: string | null
  feature_image_alt: string | null
  special_message: string | null
  special_message_color: string | null
  key_info_title: string | null
  key_info_content: string | null
  cta_text: string | null
  cta_url: string | null
  faqs: Faq[] | null
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API_URL}/public/blog/posts/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data?.post ?? null) as Post | null
  } catch {
    return null
  }
}

const MESSAGE_COLORS: Record<string, string> = {
  blue:   'border-blue-200 bg-blue-50 text-blue-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-900',
  teal:   'border-teal/20 bg-teal-light text-teal-dark',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found' }
  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || ''
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://carestreamai.co.uk/blog/${post.slug}`,
      ...(post.og_image_url ? { images: [post.og_image_url] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const date = post.publication_date
    ? new Date(post.publication_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const faqs = (post.faqs ?? []).filter(f => f?.question?.trim() && f?.answer?.trim())

  return (
    <ArticleLayout
      category={post.category}
      date={date}
      readTime={`${post.read_time_minutes} min read`}
      title={post.title}
    >
      {post.feature_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.feature_image_url}
          alt={post.feature_image_alt ?? post.title}
          className="not-prose mb-8 aspect-video w-full rounded-xl object-cover"
        />
      )}

      {post.special_message && (
        <div
          className={`not-prose mb-8 rounded-xl border px-5 py-4 text-sm ${MESSAGE_COLORS[post.special_message_color ?? 'teal'] ?? MESSAGE_COLORS.teal}`}
          dangerouslySetInnerHTML={{ __html: post.special_message }}
        />
      )}

      {(post.key_info_title || post.key_info_content) && (
        <div className="not-prose mb-8 rounded-xl border border-teal/20 bg-teal-light/40 p-6">
          {post.key_info_title && <p className="mb-2 text-sm font-semibold text-teal-dark">{post.key_info_title}</p>}
          {post.key_info_content && <div className="text-sm text-neutral-mid" dangerouslySetInnerHTML={{ __html: post.key_info_content }} />}
        </div>
      )}

      {/* Main body — stored as HTML in the admin editor */}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      {faqs.length > 0 && (
        <div className="not-prose mt-12 border-t border-gray-100 pt-8">
          <h2 className="mb-6 text-xl font-extrabold text-neutral-dark">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((f, i) => (
              <div key={i}>
                <p className="mb-1 font-semibold text-neutral-dark">{f.question}</p>
                <p className="text-sm leading-relaxed text-neutral-mid" dangerouslySetInnerHTML={{ __html: f.answer }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {post.cta_text && post.cta_url && (
        <div className="not-prose mt-12 rounded-xl bg-teal-light p-6 text-center">
          <Link href={post.cta_url} className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
            {post.cta_text} →
          </Link>
        </div>
      )}
    </ArticleLayout>
  )
}
