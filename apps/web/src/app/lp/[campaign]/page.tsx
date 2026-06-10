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
  return {
    title:       { absolute: page.meta_title ?? page.content.hero.headline },
    description: page.meta_description ?? page.content.hero.subheadline,
    robots:      page.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph:   page.og_image_url ? { images: [page.og_image_url] } : undefined,
  }
}

export default async function LpRoute({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign } = await params
  const page = await getLandingPage(campaign)
  if (!page) notFound()
  return <LandingPage page={page} />
}
