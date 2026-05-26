import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CareStreamAI for Domiciliary Care',
  description: 'CareStreamAI helps domiciliary care providers give community care workers instant policy access on the move — in any language, via WhatsApp, email, or web chat.',
  openGraph: {
    title: 'CareStreamAI for Domiciliary Care',
    description: 'Instant policy access for community care workers, on the move, in any language.',
    url: 'https://carestreamai.co.uk/domiciliary-care',
  },
}

export default function DomiciliaryCarePage() {
  return (
    <>
      <PageHero
        label="Domiciliary Care"
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
