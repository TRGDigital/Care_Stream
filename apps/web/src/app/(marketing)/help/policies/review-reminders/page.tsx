import { HelpArticle, MockPolicyLibrary } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Setting Policy Review Reminders | CareStream' },
  description: 'How to set review dates for your policies in CareStream so you are reminded before each one falls due, keeping your whole review schedule in one place.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Policy Management"
      title="Setting policy review reminders"
      intro="Set a review date for each policy and CareStreamAI will remind you before it falls due, so nothing is missed."
      mockup={<MockPolicyLibrary />}
      mockupCaption="Set a review date against any policy"
      blocks={[
        { type: 'p', text: 'Most policies need reviewing on a regular basis. Review reminders help you stay on top of this without keeping a separate spreadsheet.' },
        { type: 'subheading', text: 'How to set a reminder' },
        { type: 'steps', items: [
          'Open a policy in the Policies area.',
          'Set the date the policy is next due for review.',
          'Save your changes. You will receive a reminder before that date arrives.',
        ] },
        { type: 'subheading', text: 'Why this helps' },
        { type: 'bullets', items: [
          'You can show inspectors that policies are reviewed on a planned cycle.',
          'You avoid policies quietly going out of date.',
          'Your whole review schedule sits in one place.',
        ] },
      ]}
      related={[
        { title: 'How to update a policy', href: '/help/policies/update-policy' },
        { title: 'Policy version history and archiving', href: '/help/policies/versioning' },
        { title: 'Generating a CQC Readiness Report', href: '/help/analytics/cqc-report' },
      ]}
    />
  )
}
