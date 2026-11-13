import type { Metadata } from 'next'
import { TrainingCheckout, type ModuleInfo } from '@/components/marketing/checkout-page'
import { isFreeCpd } from '@/lib/free-cpd'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The training basket and checkout, in the design approved in the content theme. The basket
// itself lives in the browser (cart-store); this server page only supplies each course's cover
// image and length, read from the public catalogue so a new course needs no code change.

export const metadata: Metadata = {
  title: 'Your basket | CareStreamAI',
  description: 'Review the training in your basket and continue. CPD certified courses are free for every member of staff.',
  alternates: { canonical: 'https://www.carestreamai.com/basket' },
  robots: { index: false, follow: true },
}

async function loadModules(): Promise<Record<string, ModuleInfo>> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 3600 } })
    if (!res.ok) return {}
    const body = await res.json()
    const topics = (body?.data?.topics ?? []) as {
      slug: string; title?: string; illustration_url: string | null; duration_minutes: number | null; cpd_accredited?: boolean
    }[]
    return Object.fromEntries(topics.map(t => [t.slug, {
      image: t.illustration_url ? `${API_URL}${t.illustration_url}` : null,
      minutes: t.duration_minutes,
      title: t.title,
      free: isFreeCpd(t),
    }]))
  } catch {
    // The basket still works without images: they are decoration, not the order.
    return {}
  }
}

export default async function BasketPage() {
  return <TrainingCheckout modules={await loadModules()} />
}
