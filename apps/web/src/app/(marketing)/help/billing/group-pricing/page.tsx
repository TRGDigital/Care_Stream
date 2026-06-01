import { HelpArticle, MockBilling } from '@/components/marketing/help'

export const metadata = {
  title: 'Group pricing for multiple homes',
  description: 'How group pricing works for providers running more than one care home. Per home pricing with unlimited staff users, and help setting up each location.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Account and Billing"
      title="Group pricing for multiple homes"
      intro="If you run more than one home, group pricing makes it simple to bring them all onto CareStreamAI. Here is how it works."
      mockup={<MockBilling />}
      mockupCaption="Manage your plan in the billing area"
      blocks={[
        { type: 'p', text: 'Many providers run several homes. Group pricing is designed to make managing more than one location straightforward and good value.' },
        { type: 'subheading', text: 'How group pricing works' },
        { type: 'bullets', items: [
          'Pricing is per home, with unlimited staff users at each one.',
          'Bringing several homes together can reduce the cost per home.',
          'Each home keeps its own policies and its own private account.',
        ] },
        { type: 'subheading', text: 'How to arrange it' },
        { type: 'steps', items: [
          'Contact our team and let us know how many homes you run.',
          'We will put together pricing that suits your group.',
          'We will help you set up each home so your teams can get started.',
        ] },
        { type: 'note', text: 'Speak to us about group pricing and we will find the right arrangement for you.' },
      ]}
      related={[
        { title: 'Changing your plan', href: '/help/billing/change-plan' },
        { title: 'Updating payment details', href: '/help/billing/payment-details' },
        { title: 'Your 14 day trial, what is included', href: '/help/getting-started/trial' },
      ]}
    />
  )
}
