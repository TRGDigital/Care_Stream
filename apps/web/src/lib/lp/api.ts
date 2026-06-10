import type { LpPage } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fetch an active landing page by campaign slug (product is always carestream).
export async function getLandingPage(campaign: string): Promise<LpPage | null> {
  try {
    const res = await fetch(`${API_URL}/public/lp/${encodeURIComponent(campaign)}`, { next: { revalidate: 30 } })
    if (res.ok) return ((await res.json())?.data ?? null) as LpPage
  } catch {
    // fall through
  }
  return null
}
