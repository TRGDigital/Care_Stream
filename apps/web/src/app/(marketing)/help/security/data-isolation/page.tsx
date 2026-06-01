import { HelpArticle, MockSecurity } from '@/components/marketing/help'

export const metadata = {
  title: 'How data isolation works',
  description: 'How CareStreamAI keeps your account separate from every other organisation, so your policies and activity stay private and are never used to train AI.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Data and Security"
      title="How data isolation works"
      intro="Your account is kept completely separate from every other organisation, so your information is only ever seen by your own team."
      mockup={<MockSecurity />}
      mockupCaption="Your account is private to your organisation"
      blocks={[
        { type: 'p', text: 'Each care organisation using CareStreamAI has its own private account. Your policies, staff and activity are kept separate from everyone else.' },
        { type: 'subheading', text: 'What this means for you' },
        { type: 'bullets', items: [
          'Only people you invite can see your information.',
          'Other organisations can never see your policies or activity.',
          'Your information is private to your organisation and is never shared.',
        ] },
        { type: 'p', text: 'Your policies are also never used to train AI models. Your documents remain yours and are used only to answer your own team.' },
        { type: 'note', text: 'For more detail you can request our Data Processing Agreement.' },
      ]}
      related={[
        { title: 'Where is our data stored', href: '/help/security/data-storage' },
        { title: 'Requesting your Data Processing Agreement', href: '/help/security/dpa' },
        { title: 'Data retention and deletion', href: '/help/security/retention' },
      ]}
    />
  )
}
