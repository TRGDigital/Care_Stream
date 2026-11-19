import type { ScenarioReadNext } from '@/components/marketing/scenario-page'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The blog posts a scenario recommends, looked up by slug from the public blog list so the
// title, summary and picture are always the post's current ones. A failure returns an empty
// list: the reading list is an addition to the page, not part of it.
export async function getScenarioReadNext(slugs: string[]): Promise<ScenarioReadNext[]> {
  if (!slugs?.length) return []
  try {
    const res = await fetch(`${API_URL}/public/blog/posts`, typeof window === 'undefined' ? { next: { revalidate: 300 } } : undefined)
    if (!res.ok) return []
    const posts = ((await res.json())?.data?.posts ?? []) as ScenarioReadNext[]
    return slugs.map(s => posts.find(p => p.slug === s)).filter(Boolean) as ScenarioReadNext[]
  } catch {
    return []
  }
}
