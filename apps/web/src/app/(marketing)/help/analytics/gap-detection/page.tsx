import { HelpArticle, MockGaps } from '@/components/marketing/help'

export const metadata = {
  title: 'Policy gap detection, how it works',
  description: 'How CareStreamAI highlights staff questions your current policies do not yet answer, with a coverage score, so you know which policies to add next.',
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
        { type: 'note', text: 'Acting on gaps means your library keeps improving based on what your team actually needs.' },
      ]}
      related={[
        { title: 'Organising your policy library', href: '/help/policies/organising' },
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
      ]}
    />
  )
}
