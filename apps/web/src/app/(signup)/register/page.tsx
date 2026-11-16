import { RegisterForm } from './register-form'
import { signupContext } from '@/lib/signup-context'

// The create-account page. The link (free or trial, where the visitor came from, a pre-filled email) is read on the
// server so the heading is right on the first paint. For a blog link (source=blog-<slug>) it also looks up the post title.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const clean = (v: unknown, max = 100) => String(Array.isArray(v) ? v[0] : v ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, max)

async function blogTitle(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/public/blog/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json())?.data?.post?.title ?? null
  } catch { return null }
}

export default async function RegisterPage(props: { searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>> }) {
  const q = (await Promise.resolve(props.searchParams)) ?? {}
  const tierRaw = String(Array.isArray(q.tier) ? q.tier[0] : q.tier ?? '')
  const tier = tierRaw === 'free' ? 'free' : tierRaw === 'training_only' ? 'training_only' : 'full'
  const source = clean(q.source)
  const course = clean(q.course, 80)
  const email = String(Array.isArray(q.email) ? q.email[0] : q.email ?? '').trim().slice(0, 200)
  const code = String(Array.isArray(q.code) ? q.code[0] : q.code ?? '').slice(0, 100)
  const topic = clean(q.topic, 20)
  // The Growth email a visitor clicked (a contact id, a UUID). Anything else is ignored.
  const grefRaw = String(Array.isArray(q.gref) ? q.gref[0] : q.gref ?? '').trim()
  const gref = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(grefRaw) ? grefRaw.toLowerCase() : ''
  const title = tier === 'free' && source.startsWith('blog-') ? await blogTitle(source.slice(5)) : null
  const ctx = tier === 'free' ? signupContext(source, course, { topic, blogTitle: title }) : null
  return <RegisterForm initial={{ tier, source, course, code, email, gref, ctx }} />
}
