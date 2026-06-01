import { HelpArticle, MockDashboard } from '@/components/marketing/help'

export const metadata = {
  title: 'Setting up your account',
  description: 'How to set up your CareStreamAI account after you sign up. Sign in, add your care home details, upload a policy and invite your team in a few minutes.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Getting Started"
      title="Setting up your account"
      intro="Getting your care home set up on CareStreamAI takes only a few minutes. Here is what to do after you sign up."
      mockup={<MockDashboard />}
      mockupCaption="Your dashboard once your account is set up"
      blocks={[
        { type: 'p', text: 'When you start your free trial you receive a welcome email with a link to your CareStreamAI portal. Click the link and choose a password to sign in for the first time.' },
        { type: 'subheading', text: 'First steps' },
        { type: 'steps', items: [
          'Sign in using the link in your welcome email and set your password.',
          'Add your care home name and a few basic details so your portal is ready for your team.',
          'Upload your first policy so staff have something to ask about straight away.',
          'Invite your team so they can begin asking questions.',
        ] },
        { type: 'subheading', text: 'Who should set up the account' },
        { type: 'p', text: 'The first account is usually created by a manager or administrator. This person becomes the admin and can invite other staff, upload policies and view reports. You can add more admins later if you want to share these tasks.' },
        { type: 'note', text: 'You can explore the whole portal during your free trial. Nothing is charged until you choose a plan.' },
      ]}
      related={[
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
        { title: 'Inviting staff to use CareStreamAI', href: '/help/getting-started/invite-staff' },
        { title: 'Your 14 day trial, what is included', href: '/help/getting-started/trial' },
      ]}
    />
  )
}
