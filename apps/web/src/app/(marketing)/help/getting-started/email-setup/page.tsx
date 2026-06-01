import { HelpArticle, MockEmailSettings } from '@/components/marketing/help'

export const metadata = {
  title: 'Setting up email access',
  description: 'How to switch on email access in CareStreamAI so staff can ask policy questions by email and receive an answer back in the same thread.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Getting Started"
      title="Setting up email access"
      intro="Staff can ask policy questions by email as well as web chat. Here is how to switch email access on for your team."
      mockup={<MockEmailSettings />}
      mockupCaption="The email settings in your portal"
      blocks={[
        { type: 'p', text: 'Email access lets staff ask a question by sending an email and receive an answer back in the same thread. It is useful for team members who prefer email or who do not log in to the portal often.' },
        { type: 'subheading', text: 'How email access works' },
        { type: 'p', text: 'Your account is given its own email address for questions. Staff simply email that address and receive a reply drawn from your policies.' },
        { type: 'subheading', text: 'How to set it up' },
        { type: 'steps', items: [
          'Open Settings and find the Email section.',
          'Note the email address shown for your team. You can share this with staff.',
          'Add the email addresses of the staff who are allowed to use it to the approved senders list.',
          'Save your changes. Approved staff can now email questions straight away.',
        ] },
        { type: 'note', text: 'Only approved senders can use email access, which keeps your account secure.' },
      ]}
      related={[
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
        { title: 'Inviting staff to use CareStreamAI', href: '/help/getting-started/invite-staff' },
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
      ]}
    />
  )
}
