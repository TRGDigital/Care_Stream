import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/marketing/article-layout'
import { BlogFaqs } from '@/components/marketing/blog-faqs'
import { JsonLd } from '@/components/json-ld'
import { blogPostingSchema, faqPageSchema, hyperTocSchema } from '@/lib/schema'
import { buildBlogToc } from '@/lib/blog-toc'

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
  updated_at: string | null
  sources: Array<{ label: string; url: string }> | null
  author: { name: string; title: string | null; photo_url: string | null; bio: string | null; linkedin_url: string | null } | null
}

interface RelatedPost {
  slug: string
  title: string
  excerpt: string | null
  category: string
  read_time_minutes: number
  feature_image_url: string | null
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

async function getRelated(slug: string): Promise<RelatedPost[]> {
  // Same-category cluster from the API (topical relevance)…
  let apiRelated: RelatedPost[] = []
  try {
    const res = await fetch(`${API_URL}/public/blog/posts/${slug}/related`, { next: { revalidate: 60 } })
    if (res.ok) apiRelated = ((await res.json())?.data?.posts ?? []) as RelatedPost[]
  } catch { /* fall through */ }

  // …topped up with a rotating window over ALL posts, so every post is linked
  // from several others (even in-degree, no post orphaned with a single link).
  let all: RelatedPost[] = []
  try {
    const res = await fetch(`${API_URL}/public/blog/posts`, { next: { revalidate: 900 } })
    if (res.ok) all = ((await res.json())?.data?.posts ?? []) as RelatedPost[]
  } catch { /* fall through */ }

  const idx = all.findIndex((p) => p.slug === slug)
  const windowPosts: RelatedPost[] = []
  if (idx >= 0 && all.length > 1) {
    const take = Math.min(4, all.length - 1)
    for (let k = 1; k <= take; k++) windowPosts.push(all[(idx + k) % all.length])
  }

  const seen = new Set<string>([slug])
  const merged: RelatedPost[] = []
  // Relevance first (cap same-category so the window is never fully squeezed out),
  // then the coverage window.
  for (const p of [...apiRelated.slice(0, 2), ...windowPosts, ...apiRelated.slice(2)]) {
    if (p?.slug && !seen.has(p.slug)) { seen.add(p.slug); merged.push(p) }
  }
  return merged.slice(0, 6)
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
    alternates: { canonical: `https://www.carestreamai.com/blog/${post.slug}` },
    openGraph: {
    type: 'article',
      title,
      description,
      url: `https://www.carestreamai.com/blog/${post.slug}`,
      ...(post.og_image_url ? { images: [post.og_image_url] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  const related = await getRelated(slug)

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const date = post.publication_date ? fmtDate(post.publication_date) : ''
  // Show a visible "Last updated" only when the post was meaningfully revised
  // after publication (more than 2 days later), so trivial edits don't churn it.
  const DAY = 86_400_000
  const showUpdated = !!(post.updated_at && post.publication_date &&
    new Date(post.updated_at).getTime() - new Date(post.publication_date).getTime() > 2 * DAY)
  const updatedDate = post.updated_at ? fmtDate(post.updated_at) : ''
  const sources = (post.sources ?? []).filter(s => s?.url)
  const faqs = (post.faqs ?? []).filter(f => f?.question?.trim() && f?.answer?.trim())
  const { html: bodyHtml, headings } = buildBlogToc(post.content)

  return (
    <>
      <JsonLd data={[
        blogPostingSchema(post, headings.length > 0),
        ...(headings.length > 0 ? [hyperTocSchema(post.slug, headings)] : []),
        ...(faqs.length > 0 ? [faqPageSchema(faqs)] : []),
      ]} />
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

      {showUpdated && (
        <p className="not-prose -mt-2 mb-8 text-sm text-neutral-mid">
          Last updated <time dateTime={post.updated_at ?? undefined} className="font-medium text-neutral-dark">{updatedDate}</time>
        </p>
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

      {/* Main body — stored as HTML in the admin editor. A linked Table of
          Contents is generated at render time and injected above the first H2;
          the matching HyperToc structured data is emitted above. */}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {/* Sources / citations — authoritative references set in the admin. Rendered
          here and emitted as schema.org "citation" in the article JSON-LD. */}
      {sources.length > 0 && (
        <div className="not-prose mt-12 rounded-xl border border-gray-100 bg-neutral-light/50 p-6">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-dark">Sources</p>
          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-teal hover:underline"
                >
                  {s.label || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {faqs.length > 0 && <BlogFaqs faqs={faqs} />}

      {/* Per-post custom CTA (optional, set in the admin editor) */}
      {post.cta_text && post.cta_url && (
        <div className="not-prose mt-12 rounded-xl bg-teal-light p-6 text-center">
          <Link href={post.cta_url} className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
            {post.cta_text} →
          </Link>
        </div>
      )}

      {/* Standard end-of-article CTA — only when the post has no custom CTA */}
      {!(post.cta_text && post.cta_url) && (
        <div className="not-prose mt-12 rounded-xl border border-teal/20 bg-teal-light p-8 text-center">
          <p className="mb-1 text-lg font-extrabold text-neutral-dark">See CareStream in action</p>
          <p className="mb-5 text-sm text-neutral-mid">Book a demo or start your free trial today.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/demo" className="btn-amber inline-flex items-center justify-center rounded-btn px-6 py-2.5 text-sm">
              Book a Demo
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-btn border border-teal px-6 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal hover:text-white">
              Start Free Trial
            </Link>
          </div>
        </div>
      )}

      {/* Author bio — set per post in the admin (blog author) */}
      {post.author && (post.author.bio || post.author.name) && (
        <div className="not-prose mt-10 flex items-start gap-4 border-t border-gray-100 pt-6">
          {post.author.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.photo_url}
              alt={post.author.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-semibold text-neutral-dark">{post.author.name}</p>
            {post.author.title && <p className="text-xs text-neutral-mid">{post.author.title}</p>}
            {post.author.bio && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{post.author.bio}</p>
            )}
          </div>
        </div>
      )}

      {/* Related articles — same-category topic cluster for internal interlinking */}
      {related.length > 0 && (
        <div className="not-prose mt-14 border-t border-gray-100 pt-8">
          <p className="mb-5 text-lg font-extrabold text-neutral-dark">Related articles</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(r => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-card"
              >
                {r.feature_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.feature_image_url} alt={r.title} className="aspect-video w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-teal">{r.category}</p>
                  <p className="font-semibold leading-snug text-neutral-dark group-hover:text-teal">{r.title}</p>
                  {r.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-neutral-mid">{r.excerpt}</p>}
                  <p className="mt-3 text-xs text-neutral-mid">{r.read_time_minutes} min read</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      </ArticleLayout>
    </>
  )
}
