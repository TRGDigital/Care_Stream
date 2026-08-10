import { MetadataRoute } from 'next'
import { SETTINGS_LIST } from '@/lib/settings/list'
import { HELP_ARTICLE_PATHS } from '@/lib/help-articles'

// Canonical host is www (the apex 308-redirects to it). The sitemap MUST use www
// or Google reports every entry as "Page with redirect".
const BASE = 'https://www.carestreamai.com'

type Entry = { url: string; lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }

// The "who we serve" index plus every per-setting page.
const SETTINGS: Entry[] = [
  { url: '/who-we-serve', changeFrequency: 'monthly', priority: 0.7 },
  ...SETTINGS_LIST.map((s) => ({ url: `/${s.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
]

const MARKETING: Entry[] = [
  { url: '/',                                      changeFrequency: 'weekly',  priority: 1.0 },
  { url: '/how-it-works',                          changeFrequency: 'monthly', priority: 0.9 },
  { url: '/care-policies',                         changeFrequency: 'monthly', priority: 0.9 },
  { url: '/policy-gap-detection',                  changeFrequency: 'monthly', priority: 0.9 },
  { url: '/pricing',                               changeFrequency: 'weekly',  priority: 0.9 },
  { url: '/features/web-chat-interface',           changeFrequency: 'monthly', priority: 0.7 },
  { url: '/who-its-for',                           changeFrequency: 'monthly', priority: 0.8 },
  { url: '/staff-training',                        changeFrequency: 'monthly', priority: 0.9 },
  { url: '/hr-policies',                           changeFrequency: 'monthly', priority: 0.9 },
  { url: '/care-audits',                           changeFrequency: 'monthly', priority: 0.9 },
  { url: '/cqc-compliance',                        changeFrequency: 'monthly', priority: 0.9 },
  { url: '/cqc-staff-questions',                   changeFrequency: 'monthly', priority: 0.8 },
  { url: '/business-continuity',                   changeFrequency: 'monthly', priority: 0.8 },
  { url: '/cqc-report-chat',                       changeFrequency: 'monthly', priority: 0.8 },
  { url: '/regulatory-knowledge',                  changeFrequency: 'monthly', priority: 0.7 },
  { url: '/rag',                                   changeFrequency: 'monthly', priority: 0.7 },
  { url: '/residential-care',                      changeFrequency: 'monthly', priority: 0.8 },
  { url: '/nursing-homes',                         changeFrequency: 'monthly', priority: 0.8 },
  { url: '/domiciliary-care',                      changeFrequency: 'monthly', priority: 0.8 },
  { url: '/about',                                 changeFrequency: 'monthly', priority: 0.7 },
  { url: '/trust',                                 changeFrequency: 'monthly', priority: 0.7 },
  { url: '/case-studies',                          changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog',                                  changeFrequency: 'weekly',  priority: 0.8 },
  { url: '/faq',                                   changeFrequency: 'monthly', priority: 0.6 },
  { url: '/demo',                                  changeFrequency: 'monthly', priority: 0.8 },
  { url: '/contact',                               changeFrequency: 'monthly', priority: 0.6 },
  { url: '/languages',                             changeFrequency: 'monthly', priority: 0.6 },
  { url: '/help',                                  changeFrequency: 'monthly', priority: 0.5 },
  // Legal pages (static routes) — indexable, so they belong in the sitemap.
  { url: '/privacy',                               changeFrequency: 'yearly',  priority: 0.3 },
  { url: '/terms',                                 changeFrequency: 'yearly',  priority: 0.3 },
  { url: '/cookies',                               changeFrequency: 'yearly',  priority: 0.3 },
  { url: '/dpa',                                   changeFrequency: 'yearly',  priority: 0.3 },
]

// Every Help Centre article, derived from the shared manifest so the sitemap
// stays in lockstep with the pages that actually exist.
const HELP: Entry[] = HELP_ARTICLE_PATHS.map((url) => ({
  url,
  changeFrequency: 'monthly' as const,
  priority: 0.4,
}))

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The per-module staff-training guide pages are data-driven, so pull their paths
// from the API rather than hard-coding them. Falls back to none on error.
async function trainingPages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/seo-index`, { next: { revalidate: 900 } })
    if (res.ok) {
      const pages = (await res.json())?.data?.pages ?? []
      return (pages as Array<{ path?: string }>)
        .filter((p) => p.path)
        .map((p) => ({ url: p.path as string, changeFrequency: 'monthly' as const, priority: 0.7 }))
    }
  } catch {
    // fall through
  }
  return []
}

// The per-module purchase pages mirror the staff-training slugs, so derive their
// /buy/<slug> paths from the same seo-index feed. Falls back to none on error.
async function buyPages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/seo-index`, { next: { revalidate: 900 } })
    if (res.ok) {
      const pages = (await res.json())?.data?.pages ?? []
      return (pages as Array<{ path?: string }>)
        .map((p) => p.path?.match(/^\/staff-training\/(.+)$/)?.[1])
        .filter((slug): slug is string => !!slug)
        .map((slug) => ({ url: `/buy/${slug}`, changeFrequency: 'monthly' as const, priority: 0.6 }))
    }
  } catch {
    // fall through
  }
  return []
}

// Blog posts are DB-driven (published in the platform admin), so pull their slugs
// from the public API rather than hard-coding them. Falls back to none on error.
async function blogPages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/blog/posts`, { next: { revalidate: 900 } })
    if (res.ok) {
      const posts = (await res.json())?.data?.posts ?? []
      return (posts as Array<{ slug?: string }>)
        .filter((p) => p.slug)
        .map((p) => ({ url: `/blog/${p.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 }))
    }
  } catch {
    // fall through
  }
  return []
}

// Collections are DB-driven (published in the platform admin), so pull their slugs
// from the public API rather than hard-coding them. Falls back to none on error.
async function collectionPages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/collections`, { next: { revalidate: 900 } })
    if (res.ok) {
      const collections = (await res.json())?.data?.collections ?? []
      const items = (collections as Array<{ slug?: string }>)
        .filter((c) => c.slug)
        .map((c) => ({ url: `/collections/${c.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 }))
      // Include the index when there is at least one collection.
      return items.length > 0 ? [{ url: '/collections', changeFrequency: 'weekly', priority: 0.7 }, ...items] : []
    }
  } catch {
    // fall through
  }
  return []
}

// Feature pages are DB-driven (published in the platform admin), so pull their
// slugs from the public API rather than hard-coding them. Falls back to none.
async function featurePages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/feature-pages`, { next: { revalidate: 900 } })
    if (res.ok) {
      const items = (await res.json())?.data?.featurePages ?? []
      return (items as Array<{ slug?: string }>)
        .filter((f) => f.slug)
        .map((f) => ({ url: `/features/${f.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 }))
    }
  } catch {
    // fall through
  }
  return []
}

// CMS content pages are DB-driven (managed in the platform Pages tab) and rendered
// by the [...slug] catch-all — e.g. /client-services-agreement. Pull the published
// ones from the API so they appear in the sitemap without a per-page code change.
async function cmsPages(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages/index`, { next: { revalidate: 900 } })
    if (res.ok) {
      const pages = (await res.json())?.data?.pages ?? []
      return (pages as Array<{ path?: string }>)
        .filter((p) => p.path && p.path.startsWith('/'))
        .map((p) => ({ url: p.path as string, changeFrequency: 'monthly' as const, priority: 0.4 }))
    }
  } catch {
    // fall through
  }
  return []
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  // Dedupe by path (some settings also appear in MARKETING), first entry wins.
  const seen = new Set<string>()
  const [training, buy, blog, collections, features, cms] = await Promise.all([trainingPages(), buyPages(), blogPages(), collectionPages(), featurePages(), cmsPages()])
  const entries = [...MARKETING, ...HELP, ...SETTINGS, ...training, ...buy, ...blog, ...collections, ...features, ...cms].filter((e) => {
    if (seen.has(e.url)) return false
    seen.add(e.url)
    return true
  })
  return entries.map(({ url, changeFrequency, priority }) => ({
    url:             `${BASE}${url}`,
    lastModified:    now,
    changeFrequency,
    priority,
  }))
}
