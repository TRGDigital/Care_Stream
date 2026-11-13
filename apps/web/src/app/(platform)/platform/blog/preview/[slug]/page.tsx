'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getPlatformToken, createPlatformClient, type BlogPost } from '@/lib/platform-api'
import { BlogPostV2 } from '@/components/marketing/blog-post-v2'
import { KeywordHighlighter } from '@/components/marketing/keyword-highlighter'
import { buildBlogToc } from '@/lib/blog-toc'

// Draft preview for the platform blog. Draft posts are not served by the public site, so this
// page loads the post from the admin API with the platform token and shows it in the live post
// design. Add ?yellowkws to the URL to highlight the post's target keywords.

export default function BlogDraftPreview() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug ?? '')
  const [post, setPost] = useState<BlogPost | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'noauth'>('loading')

  useEffect(() => {
    const token = getPlatformToken()
    if (!token) { setState('noauth'); return }
    createPlatformClient(token).blog.posts().then(r => {
      const p = r.posts.find(x => x.slug === slug) ?? null
      setPost(p); setState(p ? 'ok' : 'missing')
    }).catch(() => setState('missing'))
  }, [slug])

  if (state === 'loading') return <p style={{ padding: 40 }}>Loading the draft…</p>
  if (state === 'noauth') return <p style={{ padding: 40 }}>Sign in to the platform console first (<Link href="/platform/login">platform login</Link>), then reopen this link.</p>
  if (state === 'missing' || !post) return <p style={{ padding: 40 }}>No post with the slug "{slug}". <Link href="/platform/blog">Back to the blog</Link></p>

  const { headings } = buildBlogToc(post.content, { inject: false })
  void headings
  return (
    <div>
      <div style={{ background: '#FFE600', color: '#000', padding: '10px 16px', fontSize: 14, fontWeight: 600, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{post.status === 'published' ? 'Published post' : `Draft preview (${post.status})`}: only you can see this. Add ?yellowkws to the address to highlight the keywords.</span>
        <span><Link href="/platform/blog" style={{ textDecoration: 'underline' }}>Back to the platform blog</Link></span>
      </div>
      <BlogPostV2 post={post as any} related={[]} />
      <KeywordHighlighter slug={post.slug} keywords={{ primary: post.primary_keyword, secondary: post.secondary_keywords ?? [] }} />
    </div>
  )
}
