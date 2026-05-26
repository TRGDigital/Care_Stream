import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CareStreamAI for Nursing Homes',
  description: 'CareStreamAI supports nursing home teams with instant policy access for registered nurses, care assistants, and senior carers — in any language, any shift, any time.',
  openGraph: {
    title: 'CareStreamAI for Nursing Homes',
    description: 'Instant policy access for nursing home staff — any language, any shift, any time.',
    url: 'https://carestreamai.co.uk/nursing-homes',
  },
}

export default function NursingHomesPage() {
  return (
    <>
      <PageHero
        label="Nursing Homes"
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
