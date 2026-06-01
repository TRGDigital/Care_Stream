import { HelpArticle, MockBilling } from '@/components/marketing/help'

export const metadata = {
  title: 'Updating payment details',
  description: 'How to update your payment details in CareStreamAI so your service continues without interruption. Your details are handled securely.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Account and Billing"
      title="Updating payment details"
      intro="Keeping your payment details current means your service continues without interruption. Here is how to update them."
      mockup={<MockBilling />}
      mockupCaption="Update your payment method in the billing area"
      blocks={[
        { type: 'subheading', text: 'How to update your details' },
        { type: 'steps', items: [
          'Open the Billing area in your portal.',
          'Choose to update your payment method.',
          'Enter your new card details and save.',
        ] },
        { type: 'p', text: 'Your payment details are handled securely. Your new details are used from your next billing date.' },
        { type: 'note', text: 'If a payment does not go through, we will let you know so you can update your details and keep your service running.' },
      ]}
      related={[
        { title: 'Changing your plan', href: '/help/billing/change-plan' },
        { title: 'Cancelling your subscription', href: '/help/billing/cancel' },
        { title: 'Group pricing for multiple homes', href: '/help/billing/group-pricing' },
      ]}
    />
  )
}
