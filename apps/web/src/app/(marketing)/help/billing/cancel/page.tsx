import { HelpArticle, MockBilling } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Cancelling Your Subscription | CareStream' },
  description: 'How to cancel your CareStream subscription. There is no long lock in. You keep access until the end of your billing period and will not be charged again.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Account and Billing"
      title="Cancelling your subscription"
      intro="You can cancel your subscription whenever you wish. Here is what to do and what happens next."
      mockup={<MockBilling />}
      mockupCaption="Manage your subscription in the billing area"
      blocks={[
        { type: 'p', text: 'There is no long lock in. If CareStreamAI is no longer right for you, cancelling is straightforward.' },
        { type: 'subheading', text: 'How to cancel' },
        { type: 'steps', items: [
          'Open the Billing area in your portal.',
          'Choose the option to cancel your subscription.',
          'Confirm. You will see the date your access runs until.',
        ] },
        { type: 'subheading', text: 'What happens after you cancel' },
        { type: 'bullets', items: [
          'You keep access until the end of your current billing period.',
          'You will not be charged again after that.',
          'If you would like your data removed, let us know and we will arrange it.',
        ] },
        { type: 'note', text: 'If something is not working for you, contact us before you cancel. We are happy to help.' },
      ]}
      related={[
        { title: 'Changing your plan', href: '/help/billing/change-plan' },
        { title: 'Updating payment details', href: '/help/billing/payment-details' },
        { title: 'Data retention and deletion', href: '/help/security/retention' },
      ]}
    />
  )
}
