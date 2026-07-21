import { HelpArticle } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/audits/action-plan', {
    title: 'Turning audits into an action plan | CareStream',
    description: 'Every completed audit can become a tracked action plan you review, approve, assign to staff and work to completion.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Monthly Audits"
      title="Turning audits into an action plan"
      intro="Every completed audit can become a tracked action plan you review, approve, assign to staff and work to completion, so improvements don't get lost in a report."
      blocks={[
        { type: 'p', text: 'When you complete an audit, CareStream drafts an action plan from its recommendations. Instead of a list of findings you have to type up yourself, you get a starting set of actions ready to review.' },

        { type: 'p', text: 'The action plan opens in its own window from the completed audit, so you can work through it without losing your place. On the audit you will see an Action plan card showing the status and how many actions are open; open it to review or update the plan.' },

        { type: 'subheading', text: 'Review and approve the draft' },
        { type: 'p', text: 'The plan starts as a draft so nothing is set in stone. You stay in control of what your team commits to.' },
        { type: 'bullets', items: [
          'Edit the wording of any action, or add your own.',
          'Set a priority and a due date.',
          'Assign each action to a staff member by picking their name from the list.',
          'When you are happy, approve the plan to start tracking it.',
        ] },

        { type: 'subheading', text: 'How staff see their actions in the hub' },
        { type: 'p', text: 'Once you approve the plan, everyone you assigned an action to sees it in their own staff hub, under a "My actions" tab. This is how the work reaches the person doing it, rather than sitting in a report only the manager reads.' },
        { type: 'bullets', items: [
          'Each staff member sees only the actions assigned to them, with the priority, the audit it came from and the due date.',
          'They move each action along themselves: Start it, then Mark done when it is finished.',
          'A due date that has passed is flagged so nothing is quietly missed.',
          'Draft plans are never shown to staff. Actions only appear once you have approved the plan.',
        ] },
        { type: 'note', text: 'Actions are matched to a staff member by their name, so assign them to the name that matches how the person is set up in your staff list.' },

        { type: 'subheading', text: 'Track it to completion' },
        { type: 'bullets', items: [
          'Each action has a status: Open, In progress, or Done.',
          'As staff update their own actions in the hub, the status updates for you too.',
          'You can reassign actions or change due dates at any time.',
        ] },

        { type: 'subheading', text: 'Older audits' },
        { type: 'p', text: 'Audits you completed before this feature existed can still get a plan. Open the completed audit, expand the AI Recommendations, and press "Generate action plan tracker". The draft is built from that audit’s existing recommendations, ready for you to review and approve.' },

        { type: 'note', text: 'A living action plan is strong evidence at inspection that you find issues and act on them, which is exactly what the Well-led key question looks for.' },
      ]}
      related={[
        { title: 'How AI audit recommendations work', href: '/help/audits/ai-recommendations' },
        { title: 'Your CQC Readiness Score', href: '/help/audits/readiness-score' },
      ]}
    />
  )
}
