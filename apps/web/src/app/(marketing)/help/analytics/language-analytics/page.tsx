import { HelpArticle, MockAnalytics } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Understanding Language Analytics | CareStream' },
  description: 'How CareStream language analytics show which languages your team asks in, helping you understand your workforce and show you support a diverse team.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Analytics and Reporting"
      title="Understanding language analytics"
      intro="Language analytics show you which languages your team is asking in, helping you understand and support your workforce."
      mockup={<MockAnalytics />}
      mockupCaption="Language use shown in your analytics"
      blocks={[
        { type: 'p', text: 'Knowing how your team uses CareStreamAI across different languages helps you support everyone well.' },
        { type: 'subheading', text: 'What you can see' },
        { type: 'bullets', items: [
          'The range of languages your staff ask in.',
          'How often each language is used.',
          'How this changes over time.',
        ] },
        { type: 'subheading', text: 'Why it is useful' },
        { type: 'p', text: 'If a large part of your team asks in a particular language, you may choose to offer extra support or make sure key information is shared clearly. It also shows inspectors that you support a diverse workforce.' },
      ]}
      related={[
        { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Which languages are supported', href: '/help/languages/supported-languages' },
      ]}
    />
  )
}
