import { HelpArticle } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/audits/ai-recommendations', {
    title: 'How AI Audit Recommendations Work | CareStream',
    description: 'When you complete a monthly audit, CareStream turns your answers into a clear, practical set of recommendations and a suggested focus for next month.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Monthly Audits"
      title="How AI audit recommendations work"
      intro="When you complete a monthly audit, CareStream turns your answers into a clear, practical set of recommendations, so you know exactly what to act on."
      blocks={[
        { type: 'p', text: 'Every CareStream audit ends with a set of recommendations. They take your completed answers and turn them into a short, practical report your team can act on straight away, instead of leaving you to work out what matters most.' },

        { type: 'subheading', text: 'What the recommendations are based on' },
        { type: 'bullets', items: [
          'Your answers to each question in the audit, including any findings and actions you recorded.',
          'Your auditor summary, the strengths, the areas to improve, and your action deadline.',
          'The CQC Single Assessment Framework, so the compliance notes point you to the right quality areas.',
        ] },
        { type: 'p', text: 'The recommendations only use the information in your completed audit. They do not invent findings, scores or details.' },

        { type: 'subheading', text: 'What you get' },
        { type: 'bullets', items: [
          'Immediate actions, anything urgent to deal with first.',
          'Priority improvements, the areas needing the most work, with practical steps.',
          'CQC compliance notes, how your findings relate to the CQC quality areas.',
          'Commendations, what your team is doing well.',
          'Next month focus, what to keep an eye on before your next audit.',
        ] },

        { type: 'subheading', text: 'When they are generated' },
        { type: 'p', text: 'The recommendations are created when you complete the audit. If your home uses manager sign-off for audits, they are generated once your care manager has approved the audit.' },

        { type: 'subheading', text: 'Manager sign-off (optional)' },
        { type: 'p', text: 'You can choose to have completed audits reviewed by your care manager before they are final. Turn this on under Settings, then Audits. When it is on, a completed audit goes to your care manager in their hub to approve or send back, and their name and the date are saved to the audit for your records.' },

        { type: 'note', text: 'Acting on the recommendations each month builds a clear, evidence-based improvement record you can show at inspection.' },
      ]}
      related={[
        { title: 'Generating a CQC Readiness Report', href: '/help/analytics/cqc-report' },
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Exporting your audit log', href: '/help/analytics/export-audit' },
      ]}
    />
  )
}
