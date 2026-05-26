import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CareStreamAI for Residential Care Homes',
  description: 'Give every member of your residential care home team instant access to your policies. CareStreamAI works across all shifts, all languages, and all care roles.',
  openGraph: {
    title: 'CareStreamAI for Residential Care Homes',
    description: 'Instant policy access for every shift and every care role, in any language.',
    url: 'https://carestreamai.co.uk/residential-care',
  },
}

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
