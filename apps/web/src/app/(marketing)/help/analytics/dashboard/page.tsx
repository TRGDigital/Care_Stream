import { HelpArticle, MockAnalytics } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Understanding Your Analytics Dashboard | CareStream' },
  description: 'How to read your CareStream analytics dashboard. See how often staff ask questions, which policies they need most, and which channels and languages they use.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Analytics and Reporting"
      title="Understanding your analytics dashboard"
      intro="Your dashboard shows how your team is using CareStreamAI at a glance, so you can see what staff need most."
      mockup={<MockAnalytics />}
      mockupCaption="The analytics view in your portal"
      blocks={[
        { type: 'p', text: 'The analytics dashboard gives managers a clear picture of activity across the home, without any spreadsheets.' },
        { type: 'subheading', text: 'What you can see' },
        { type: 'bullets', items: [
          'How many questions your team has asked over time.',
          'Which policies are asked about most often.',
          'Which channels staff use, such as web chat or email.',
          'Which languages your team is asking in.',
        ] },
        { type: 'subheading', text: 'How to use it' },
        { type: 'p', text: 'Use the dashboard to spot trends. A policy that is asked about often may be one worth making clearer, while a quiet area may simply be well understood. It also shows that staff are engaging with your policies, which is useful evidence at inspection.' },
      ]}
      related={[
        { title: 'Understanding language analytics', href: '/help/analytics/language-analytics' },
        { title: 'Policy gap detection, how it works', href: '/help/analytics/gap-detection' },
        { title: 'Generating a CQC Readiness Report', href: '/help/analytics/cqc-report' },
      ]}
    />
  )
}
