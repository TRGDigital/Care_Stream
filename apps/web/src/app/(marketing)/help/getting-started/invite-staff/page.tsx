import { HelpArticle, MockStaff } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/getting-started/invite-staff', {
    title: 'Inviting Staff to CareStream | CareStream',
    description: 'How to invite your care team to CareStream. Add unlimited staff users, choose staff or admin roles, and let everyone ask policy questions from any device.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Getting Started"
      title="Inviting staff to use CareStreamAI"
      intro="Your team can start asking policy questions as soon as you invite them. Here is how to add staff to your account."
      mockup={<MockStaff />}
      mockupCaption="The staff area in your portal"
      blocks={[
        { type: 'p', text: 'Every member of your team can have their own access. There is no limit on the number of staff users, so you can invite everyone from senior nurses to new starters.' },
        { type: 'subheading', text: 'How to invite your team' },
        { type: 'steps', items: [
          'Open the Staff area in your portal.',
          'Click Invite staff and enter the email address of each team member.',
          'Choose whether each person is a standard staff user or an admin.',
          'Send the invitations. Each person receives an email with a link to set up their own access.',
        ] },
        { type: 'subheading', text: 'Staff and admin roles' },
        { type: 'bullets', items: [
          'Staff users can ask questions through web chat, email and other channels.',
          'Admins can do everything a staff user can, plus upload policies, invite others and view reports.',
        ] },
        { type: 'note', text: 'Staff do not need to download anything. They can use CareStreamAI from any phone, tablet or computer.' },
      ]}
      related={[
        { title: 'Setting up your account', href: '/help/getting-started/account-setup' },
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
        { title: 'Setting up email access', href: '/help/getting-started/email-setup' },
        { title: 'Email versus web chat, which to use', href: '/help/languages/channels' },
      ]}
    />
  )
}
