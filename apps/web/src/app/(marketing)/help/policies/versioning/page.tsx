import { HelpArticle, MockPolicyLibrary } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Policy Version History and Archiving | CareStream' },
  description: 'How CareStream keeps a history of every policy version and how to archive policies you no longer use, giving you a clear record for CQC.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Policy Management"
      title="Policy version history and archiving"
      intro="Every version of a policy is kept, so you have a clear record of how your documents have changed over time."
      mockup={<MockPolicyLibrary />}
      mockupCaption="Each policy keeps its own version history"
      blocks={[
        { type: 'p', text: 'Good record keeping matters for CQC. CareStreamAI keeps a history of each policy so you can always see what was in place and when.' },
        { type: 'subheading', text: 'Viewing version history' },
        { type: 'steps', items: [
          'Open the Policies area and select a policy.',
          'Open its version history to see each version you have uploaded, with the date it was added.',
        ] },
        { type: 'subheading', text: 'Archiving a policy' },
        { type: 'p', text: 'If a policy is no longer in use, you can archive it. An archived policy is removed from the answers staff receive but is kept in your records, so nothing is lost.' },
        { type: 'note', text: 'Keeping old versions is helpful evidence at inspection, as it shows how your practice has developed.' },
      ]}
      related={[
        { title: 'How to update a policy', href: '/help/policies/update-policy' },
        { title: 'Organising your policy library', href: '/help/policies/organising' },
        { title: 'Exporting your audit log', href: '/help/analytics/export-audit' },
      ]}
    />
  )
}
