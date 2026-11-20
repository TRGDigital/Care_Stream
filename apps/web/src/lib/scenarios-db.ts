import type { Scenario } from '@/lib/scenarios'
import { publishedScenarios as filePublished } from '@/data/scenarios'

// Scenario pages come from two places: the repository (src/data/scenarios, the first 93) and the database (pages the nightly routine
// writes and the platform publishes, /platform/blog > Scenarios). This merges the published ones for the public site. A page in the
// database wins over a repository page with the same slug. If the API cannot be reached the repository pages still show.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function dbPublished(): Promise<Scenario[]> {
  try {
    const res = await fetch(`${API_URL}/public/scenarios`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const list = ((await res.json())?.data?.scenarios ?? []) as Scenario[]
    return list.filter(s => s && s.slug && s.status === 'published')
  } catch {
    return []
  }
}

export async function allPublishedScenarios(): Promise<Scenario[]> {
  const db = await dbPublished()
  const bySlug = new Map<string, Scenario>()
  for (const s of filePublished()) bySlug.set(s.slug, s)
  for (const s of db) bySlug.set(s.slug, s)
  return Array.from(bySlug.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getPublishedScenarioAsync(slug: string): Promise<Scenario | null> {
  return (await allPublishedScenarios()).find(s => s.slug === slug) ?? null
}
