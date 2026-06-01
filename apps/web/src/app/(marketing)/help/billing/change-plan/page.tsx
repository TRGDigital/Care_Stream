import { HelpArticle, MockBilling } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/billing/change-plan', {
    title: 'Changing Your Plan | CareStream',
    description: 'How to switch between CareStream plans at any time. Your staff and policies stay exactly as they are, and you keep unlimited staff users on every plan.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Account and Billing"
      title="Changing your plan"
      intro="You can move between plans at any time as your needs change. Here is how to switch."
      mockup={<MockBilling />}
      mockupCaption="The billing area in your portal"
      blocks={[
        { type: 'p', text: 'As your home grows or your needs change, you can move to a plan that suits you better.' },
        { type: 'subheading', text: 'How to change plan' },
        { type: 'steps', items: [
          'Open the Billing area in your portal.',
          'View the available plans and choose the one you want.',
          'Confirm your choice. Your new plan takes effect straight away.',
        ] },
        { type: 'subheading', text: 'Good to know' },
        { type: 'bullets', items: [
          'Your staff and policies stay exactly as they are when you change plan.',
          'You keep unlimited staff users on every plan.',
          'If you are not sure which plan fits, contact us and we will help.',
        ] },
      ]}
      related={[
        { title: 'Cancelling your subscription', href: '/help/billing/cancel' },
        { title: 'Updating payment details', href: '/help/billing/payment-details' },
        { title: 'Group pricing for multiple homes', href: '/help/billing/group-pricing' },
      ]}
    />
  )
}
