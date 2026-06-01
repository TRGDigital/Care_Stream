import { HelpArticle, MockChat } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'How Staff Access CareStream | CareStream' },
  description: 'How your care team uses CareStream from any device with nothing to download. Staff sign in, then ask policy questions by web chat or email.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="How staff access CareStreamAI"
      intro="Staff can use CareStreamAI from any device, with nothing to download. Here is how your team gets started."
      mockup={<MockChat />}
      mockupCaption="Staff ask questions from any browser"
      blocks={[
        { type: 'p', text: 'Once you have invited your team, each person can use CareStreamAI in whichever way suits them.' },
        { type: 'subheading', text: 'How staff sign in' },
        { type: 'steps', items: [
          'Each staff member receives an invitation email.',
          'They click the link and set their own password.',
          'They can then sign in from any phone, tablet or computer.',
        ] },
        { type: 'subheading', text: 'Asking questions' },
        { type: 'bullets', items: [
          'Open the web chat and type or speak a question.',
          'Or send a question by email if email access is switched on.',
          'Answers come back drawn from your policies, in the language they asked in.',
        ] },
        { type: 'note', text: 'There is no app to install. Staff simply open the portal in their browser.' },
      ]}
      related={[
        { title: 'Inviting staff to use CareStreamAI', href: '/help/getting-started/invite-staff' },
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
        { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
      ]}
    />
  )
}
