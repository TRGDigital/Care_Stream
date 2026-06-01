import { HelpArticle, MockChat } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Which Languages Are Supported | CareStream' },
  description: 'CareStream supports the languages spoken across UK care teams, including English, Polish, Romanian, Portuguese, Tagalog and many more.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="Which languages are supported"
      intro="CareStreamAI supports the languages spoken across UK care teams, so your whole workforce can take part."
      mockup={<MockChat />}
      mockupCaption="Staff can ask in their preferred language"
      blocks={[
        { type: 'p', text: 'CareStreamAI supports a wide range of languages commonly spoken by care workers in the UK, including those below.' },
        { type: 'subheading', text: 'Commonly used languages' },
        { type: 'bullets', items: [
          'English',
          'Polish',
          'Romanian',
          'Portuguese',
          'Spanish',
          'Tagalog',
          'Hindi',
          'Urdu',
          'Bengali',
          'Yoruba',
        ] },
        { type: 'p', text: 'If your team speaks a language not listed here, contact us and we will be glad to confirm whether it is supported.' },
        { type: 'note', text: 'Staff can ask in their preferred language at any time, with no setup needed.' },
      ]}
      related={[
        { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
        { title: 'Understanding language analytics', href: '/help/analytics/language-analytics' },
      ]}
    />
  )
}
