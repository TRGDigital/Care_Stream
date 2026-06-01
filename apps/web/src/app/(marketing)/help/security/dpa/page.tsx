import { HelpArticle, MockSecurity } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Requesting Your Data Processing Agreement | CareStream' },
  description: 'What a Data Processing Agreement covers and how to request your copy from CareStream. Available to every subscriber at no extra cost.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Data and Security"
      title="Requesting your Data Processing Agreement"
      intro="A Data Processing Agreement is available to every subscriber. Here is what it covers and how to request a copy."
      mockup={<MockSecurity />}
      mockupCaption="A Data Processing Agreement is available to every subscriber"
      blocks={[
        { type: 'p', text: 'A Data Processing Agreement, often called a DPA, sets out how your data is handled. Many care organisations keep one on file for their own governance and for inspection.' },
        { type: 'subheading', text: 'What it covers' },
        { type: 'bullets', items: [
          'How your data is processed and protected.',
          'That your data is stored within the UK and EEA.',
          'That CareStreamAI operates in full compliance with UK GDPR.',
        ] },
        { type: 'subheading', text: 'How to request a copy' },
        { type: 'steps', items: [
          'Contact our team through the contact page or your usual support channel.',
          'Let us know your organisation name.',
          'We will provide your Data Processing Agreement.',
        ] },
        { type: 'note', text: 'A Data Processing Agreement is available to every subscriber at no extra cost.' },
      ]}
      related={[
        { title: 'Where is our data stored', href: '/help/security/data-storage' },
        { title: 'How data isolation works', href: '/help/security/data-isolation' },
        { title: 'Data retention and deletion', href: '/help/security/retention' },
      ]}
    />
  )
}
