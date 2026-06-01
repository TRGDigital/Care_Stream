import { HelpArticle, MockPolicyLibrary } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'How to Update a Policy | CareStream' },
  description: 'How to upload a new version of a policy in CareStream so staff always see current guidance, while previous versions are kept in your history.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Policy Management"
      title="How to update a policy"
      intro="When a policy changes, you can upload the new version in moments so staff always see current guidance."
      mockup={<MockPolicyLibrary />}
      mockupCaption="Your policy library, where each policy can be updated"
      blocks={[
        { type: 'p', text: 'Keeping your policies current means your team always receives answers that match your latest practice.' },
        { type: 'subheading', text: 'How to update a policy' },
        { type: 'steps', items: [
          'Open the Policies area and find the policy you want to change.',
          'Click Upload new version and select the updated file.',
          'Save your changes. The new version becomes the one staff see straight away.',
        ] },
        { type: 'subheading', text: 'What happens to the old version' },
        { type: 'p', text: 'The previous version is kept in your version history rather than deleted, so you always have a record of what was in place before. Staff questions are answered from the current version.' },
        { type: 'note', text: 'After a major change it is worth letting your team know, so they can ask about anything new.' },
      ]}
      related={[
        { title: 'Policy version history and archiving', href: '/help/policies/versioning' },
        { title: 'Setting policy review reminders', href: '/help/policies/review-reminders' },
        { title: 'Organising your policy library', href: '/help/policies/organising' },
      ]}
    />
  )
}
