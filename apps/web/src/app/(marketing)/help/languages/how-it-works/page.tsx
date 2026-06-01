import { HelpArticle, MockChat } from '@/components/marketing/help'

export const metadata = {
  title: 'How multilingual support works',
  description: 'How CareStreamAI lets staff ask questions in their own language and receive answers in that same language, all drawn from your own policies.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="How multilingual support works"
      intro="Staff can ask questions in their own language and receive answers in that same language, all drawn from your policies."
      mockup={<MockChat />}
      mockupCaption="A question and answer in web chat"
      blocks={[
        { type: 'p', text: 'Many care teams speak a range of languages. CareStreamAI lets every member of staff use it comfortably, whatever language they are most confident in.' },
        { type: 'subheading', text: 'What your team experiences' },
        { type: 'bullets', items: [
          'A member of staff asks a question in their own language.',
          'They receive an answer in that same language.',
          'The answer is based on your own policies, so the guidance is always yours.',
        ] },
        { type: 'subheading', text: 'Nothing extra to set up' },
        { type: 'p', text: 'Staff do not need to choose a language or change any settings. They simply ask in the language they prefer and the reply comes back in the same language.' },
        { type: 'note', text: 'This helps overseas and international staff follow your policies accurately from their first day.' },
      ]}
      related={[
        { title: 'Which languages are supported', href: '/help/languages/supported-languages' },
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
      ]}
    />
  )
}
