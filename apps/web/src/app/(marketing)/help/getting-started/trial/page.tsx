import { HelpArticle, MockDashboard } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/getting-started/trial', {
    title: 'What Your 14 Day Trial Includes | CareStream',
    description: 'What your free CareStream trial includes. Full access to every feature, unlimited staff users and unlimited policy uploads for 14 days, no card needed.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Getting Started"
      title="Your 14 day trial, what is included"
      intro="Your free trial gives you full access to CareStreamAI for 14 days. Here is what you can do during that time."
      mockup={<MockDashboard />}
      mockupCaption="Full access to your portal during the trial"
      blocks={[
        { type: 'p', text: 'The trial is designed so you can try CareStreamAI with your own policies and your own team before you decide on a plan.' },
        { type: 'subheading', text: 'What the trial includes' },
        { type: 'bullets', items: [
          'Full access to every feature, including web chat, email, analytics and the CQC Readiness Report.',
          'Unlimited staff users, so you can invite your whole team.',
          'Unlimited policy uploads.',
        ] },
        { type: 'subheading', text: 'After the trial' },
        { type: 'p', text: 'Near the end of your 14 days we will let you know. You can choose a plan to keep everything running, or simply let the trial finish. You will not be charged unless you choose a plan.' },
        { type: 'note', text: 'You do not need to enter card details to start your trial.' },
      ]}
      related={[
        { title: 'Changing your plan', href: '/help/billing/change-plan' },
        { title: 'Group pricing for multiple homes', href: '/help/billing/group-pricing' },
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
      ]}
    />
  )
}
