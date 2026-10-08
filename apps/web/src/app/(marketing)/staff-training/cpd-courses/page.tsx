import { CpdCollection } from '@/components/marketing/cpd-collection'
import { CPD_COURSE_INFO, CPD_SLUGS, type CpdCourse } from '@/lib/cpd-collection'
import { apiAssetUrl } from '@/lib/api-client'
import { REVIEWS } from '@/lib/reviews'

// The CPD courses collection: the landing page for the CPD category Google Ads campaigns, one
// ?intent= version per ad group (lib/cpd-collection.ts). Layout A chosen by Len 2026-10-08.
// noindex while it is a demo.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export const revalidate = 300

export const metadata = {
  title: 'CPD Certified Mandatory Training for Care Staff',
  description: 'Ten CPD Certified courses for care staff, built for care settings and taught in over 60 languages. Buy single courses or a bundle for your team.',
  robots: { index: false, follow: false },
}

type Topic = { slug: string; title: string; duration_minutes?: number | null; requires_practical?: boolean; illustration_url?: string | null; cpd_accredited?: boolean }

async function getCourses(): Promise<CpdCourse[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 300 } })
    const topics = ((await res.json())?.data?.topics ?? []) as Topic[]
    const bySlug = new Map(topics.filter(t => t.cpd_accredited).map(t => [t.slug, t]))
    return CPD_SLUGS.filter(s => bySlug.has(s)).map(s => {
      const t = bySlug.get(s)!
      return { slug: s, title: CPD_COURSE_INFO[s].title, short: CPD_COURSE_INFO[s].short, minutes: t.duration_minutes || 60,
               practical: !!t.requires_practical, image: apiAssetUrl(t.illustration_url ?? null), newStarter: s === 'care-certificate' }
    })
  } catch {
    return []
  }
}

export default async function CpdCoursesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const courses = await getCourses()
  const r = REVIEWS[0]
  const review = r ? { quote: r.short ?? r.excerpt, name: r.name, setting: r.setting } : null
  return <CpdCollection courses={courses} intentKey={one(searchParams.intent)} review={review} hl={one(searchParams.hl)} />
}
