import { HelpArticle, MockSecurity } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/security/data-storage', {
    title: 'Where Is Our Data Stored | CareStream',
    description: 'Where your CareStream data is stored. Your information is kept within the UK and EEA, is private to your organisation, and is never used to train AI.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Data and Security"
      title="Where is our data stored"
      intro="Your information is kept securely and stored within the UK and EEA. Here is what that means for your care home."
      mockup={<MockSecurity />}
      mockupCaption="Your trust and security commitments"
      blocks={[
        { type: 'p', text: 'We know how important it is that your information, and your residents and staff details, are kept safe.' },
        { type: 'subheading', text: 'Where your data lives' },
        { type: 'bullets', items: [
          'Your data is stored within the UK and EEA.',
          'Your information is private to your organisation.',
          'Your policies are never used to train AI models.',
        ] },
        { type: 'p', text: 'CareStreamAI operates in full compliance with UK GDPR. If you need more detail for your own records, we provide a Data Processing Agreement to every subscriber.' },
        { type: 'note', text: 'You stay in control of your information at all times.' },
      ]}
      related={[
        { title: 'How data isolation works', href: '/help/security/data-isolation' },
        { title: 'Requesting your Data Processing Agreement', href: '/help/security/dpa' },
        { title: 'Data retention and deletion', href: '/help/security/retention' },
      ]}
    />
  )
}
