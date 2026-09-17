import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { loadServicePage } from '@/components/marketing/service-page-loader'
import { ServicePageV2 } from '@/components/marketing/service-page-v2'
import { ROLE_PAGES, rolePageSlug } from '@/lib/role-pages'

// /who-its-for/<role>: the nine role pages, rendered with the service page template from the
// copy stored in service_pages. See lib/role-pages.ts for why an unpublished page redirects.

type Props = { params: Promise<{ role: string }> }

const BASE = 'https://www.carestreamai.com'

export function generateStaticParams() {
  return ROLE_PAGES.map(r => ({ role: r.role }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params
  const entry = ROLE_PAGES.find(r => r.role === role)
  if (!entry) return {}
  const page = (await loadServicePage(rolePageSlug(role))) as
    | (Awaited<ReturnType<typeof loadServicePage>> & {
        meta_title?: string | null; meta_description?: string | null; og_image_url?: string | null
      })
    | null
  const url = `${BASE}/who-its-for/${role}`
  const title = page?.meta_title || `CareStream for ${entry.title} | CareStreamAI`
  const description = page?.meta_description || undefined
  const image = page?.og_image_url || page?.hero_image_url || '/og-image.png'
  return {
    // Absolute: the stored title already ends "| CareStreamAI", and the layout's template would
    // add it a second time.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title, description, url, images: [image] },
  }
}

export default async function RolePage({ params }: Props) {
  const { role } = await params
  const entry = ROLE_PAGES.find(r => r.role === role)
  if (!entry) notFound()
  const page = await loadServicePage(rolePageSlug(role))
  if (!page?.content?.blocks?.length) redirect(entry.fallback)
  return <ServicePageV2 page={page} />
}
