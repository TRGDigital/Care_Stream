import { HelpArticle, MockChat } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Email or Web Chat, Which to Use | CareStream' },
  description: 'Your team can ask CareStream questions by web chat or email. Both give the same answers from your policies, so staff can pick what suits them.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="Email versus web chat, which to use"
      intro="Your team can ask questions by web chat or by email. Both give the same answers from your policies, so staff can pick what suits them."
      mockup={<MockChat />}
      mockupCaption="Web chat is one of several ways to ask"
      blocks={[
        { type: 'subheading', text: 'Web chat' },
        { type: 'bullets', items: [
          'Best for quick questions while on shift.',
          'Works on any phone, tablet or computer with a web browser.',
          'Lets staff ask follow up questions in a conversation.',
        ] },
        { type: 'subheading', text: 'Email' },
        { type: 'bullets', items: [
          'Best for staff who prefer email or are away from the portal.',
          'Staff send a question and receive a reply in the same thread.',
          'Useful when someone wants a written record in their inbox.',
        ] },
        { type: 'p', text: 'There is no wrong choice. Many teams use both, and the answers are drawn from the same policies either way.' },
        { type: 'note', text: 'WhatsApp is included on every plan, and some plans also add voice. Your team can use whichever channels suit them best.' },
      ]}
      related={[
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
        { title: 'Setting up email access', href: '/help/getting-started/email-setup' },
        { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
      ]}
    />
  )
}
