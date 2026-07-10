import { HelpArticle, MockGaps } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/analytics/gap-detection', {
    title: 'How Policy Gap Detection Works | CareStream',
    description: 'How CareStream highlights staff questions your current policies do not yet answer, with a coverage score, so you know which policies to add next.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Analytics and Reporting"
      title="Policy gap detection, how it works"
      intro="Gap detection highlights questions your staff have asked that your current policies do not yet answer, so you know what to add next."
      mockup={<MockGaps />}
      mockupCaption="The policy gap report in your portal"
      blocks={[
        { type: 'p', text: 'Sometimes staff ask about something your policies do not cover. Gap detection brings these moments together so you can act on them.' },
        { type: 'subheading', text: 'What you will see' },
        { type: 'bullets', items: [
          'Common questions your policies do not currently answer.',
          'How often each of these has come up.',
          'A coverage score that gives you a simple headline figure.',
        ] },
        { type: 'subheading', text: 'How to use it' },
        { type: 'steps', items: [
          'Open the gap report in your portal.',
          'Look through the questions staff have asked that are not yet covered.',
          'Upload or update a policy to fill the gap.',
        ] },
        { type: 'subheading', text: 'Regulation coverage' },
        { type: 'p', text: 'Alongside staff questions, the report checks your policies against the regulations you are assessed on. It reads the actual content of every policy in your library, not just the titles, and works out which regulations are fully covered, which are only partly covered, and which are a gap.' },
        { type: 'p', text: 'Matching is deliberately careful, so you are never pointed at a policy that only looks related. Each regulation goes through three checks. First, a policy is only considered if its content is genuinely close in meaning. Second, the match is judged against the specific required elements of that regulation, not just the general topic. Third, a separate strict review has to confirm the match before it stands. If it does not, the regulation is treated as a gap.' },
        { type: 'p', text: 'Because it reads every policy in full, a re-run works through your regulations in batches and can take a few minutes on a large library. The button shows live progress as it goes, and you can keep working while it finishes.' },
        { type: 'note', text: 'Regulation coverage, and the step by step "what to add" guidance for each gap, are available on the Professional and Enterprise plans. Acting on gaps means your library keeps improving based on what your team actually needs.' },
      ]}
      related={[
        { title: 'Organising your policy library', href: '/help/policies/organising' },
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
      ]}
    />
  )
}
