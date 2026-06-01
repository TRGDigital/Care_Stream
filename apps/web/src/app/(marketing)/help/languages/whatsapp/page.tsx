import { HelpArticle, MockWhatsApp } from '@/components/marketing/help'

export const metadata = {
  title: 'Using CareStreamAI on WhatsApp',
  description: 'How staff ask policy questions on WhatsApp and get an answer back in the same chat, in their own language, drawn from your own policies.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Access and Languages"
      title="Using CareStreamAI on WhatsApp"
      intro="Staff can ask policy questions on WhatsApp and get an answer back in the same chat, in their own language."
      mockup={<MockWhatsApp />}
      mockupCaption="A question and answer on WhatsApp"
      blocks={[
        { type: 'p', text: 'WhatsApp is one of the easiest ways for staff to use CareStreamAI, especially when they are on the move or prefer messaging.' },
        { type: 'subheading', text: 'How staff use it' },
        { type: 'bullets', items: [
          'Staff send a question to your CareStreamAI WhatsApp number.',
          'They receive an answer back in the same chat, drawn from your policies.',
          'The answer comes back in the language they asked in.',
        ] },
        { type: 'subheading', text: 'Setting it up' },
        { type: 'steps', items: [
          'Open Settings and find the WhatsApp section.',
          'Add the phone numbers of the staff who are allowed to use it.',
          'Share your CareStreamAI WhatsApp number with your team.',
          'Approved staff can start asking questions straight away.',
        ] },
        { type: 'note', text: 'Only approved phone numbers can use WhatsApp, which keeps your account secure. WhatsApp is included on selected plans, so contact us if you are unsure whether you have it.' },
      ]}
      related={[
        { title: 'Asking questions by email', href: '/help/languages/email' },
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
        { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
      ]}
    />
  )
}
