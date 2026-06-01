import { HelpArticle, MockEmail } from '@/components/marketing/help'

export const metadata = {
  title: 'Asking questions by email',
  description: 'How staff ask policy questions by email and receive an answer back in the same thread, in their own language, with the source policy noted.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="Asking questions by email"
      intro="Staff can ask policy questions by email and receive an answer back in the same thread, drawn from your policies."
      mockup={<MockEmail />}
      mockupCaption="A question and answer by email"
      blocks={[
        { type: 'p', text: 'Email is a simple way for staff to use CareStreamAI, and it gives everyone a written record of the answer in their inbox.' },
        { type: 'subheading', text: 'How staff use it' },
        { type: 'steps', items: [
          'Send an email with your question to your team CareStreamAI email address.',
          'Wait a moment for the reply.',
          'Read the answer in the same thread, with the policy it came from noted at the end.',
        ] },
        { type: 'subheading', text: 'Good to know' },
        { type: 'bullets', items: [
          'Answers come back in the language the question was asked in.',
          'Only approved senders can use email, which keeps your account secure.',
          'Your manager can add staff to the approved senders list at any time.',
        ] },
        { type: 'note', text: 'To switch email access on, an admin can follow the steps in Setting up email access.' },
      ]}
      related={[
        { title: 'Setting up email access', href: '/help/getting-started/email-setup' },
        { title: 'Using CareStreamAI on WhatsApp', href: '/help/languages/whatsapp' },
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
      ]}
    />
  )
}
