import type { Offer } from './offer-rules'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** The shop's offers for the marketing layout. Refreshed every minute, like the image alts. */
export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const res = await fetch(`${API_URL}/public/offers/active`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const body = await res.json()
    return (body?.data?.offers ?? []) as Offer[]
  } catch {
    return []
  }
}
