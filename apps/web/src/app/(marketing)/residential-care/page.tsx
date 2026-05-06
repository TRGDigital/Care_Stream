import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = { title: 'CareStreamAI for Residential Care Homes' }

export default function ResidentialCarePage() {
  return (
    <>
      <PageHero
        label="Residential Care Homes"
        title="Content coming soon"
        subtitle="This page is being prepared. Check back shortly."
      />

      <PageCta
        heading="Ready to see CareStreamAI in action?"
        sub="Book a demo and see how it works for your home."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
