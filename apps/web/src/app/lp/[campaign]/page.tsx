import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLandingPage } from '@/lib/lp/api'
import { LandingPage } from '@/components/lp/landing-page'

// Conversion landing pages. Data-driven from Supabase; no site nav, single goal.
export const revalidate = 30

export async function generateMetadata({ params }: { params: Promise<{ campaign: string }> }): Promise<Metadata> {
  const { campaign } = await params
  const page = await getLandingPage(campaign)
  if (!page) return { title: 'CareStream' }
  const title = page.meta_title ?? page.content.hero.headline
  const description = page.meta_description ?? page.content.hero.subheadline
  return {
    title:       { absolute: title },
    description,
    robots:      page.noindex ? { index: false, follow: false } : { index: true, follow: true },
    // Complete OG set (type is required, else crawlers flag it incomplete).
    openGraph:   { type: 'website', title, description, images: [page.og_image_url || 'https://www.carestreamai.com/og-image.png'] },
  }
}

export default async function LpRoute({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign } = await params
  const page = await getLandingPage(campaign)
  if (!page) notFound()
  return <LandingPage page={page} />
}
