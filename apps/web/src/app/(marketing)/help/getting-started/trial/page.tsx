import { HelpArticle, MockDashboard } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/getting-started/trial', {
    title: 'What Your 14 Day Trial Includes | CareStream',
    description: 'What your free CareStream trial includes. Full access to every feature, unlimited staff users and unlimited policy uploads for 14 days. Add a card to start — no charge until day 14.',
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
        { type: 'p', text: 'You choose your plan and add a card when you start the trial. Near the end of your 14 days we will remind you. If you do nothing, your chosen plan begins automatically on that card. If you cancel before day 14, you are not charged.' },
        { type: 'note', text: 'A card is required to start your trial, but you are not charged until day 14 — cancel any time before then and you pay nothing.' },
      ]}
      related={[
        { title: 'Changing your plan', href: '/help/billing/change-plan' },
        { title: 'Group pricing for multiple homes', href: '/help/billing/group-pricing' },
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
      ]}
    />
  )
}
