import { HelpArticle } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/audits/readiness-score', {
    title: 'Your CQC Readiness Score | CareStream',
    description: 'An at-a-glance score of how ready you would be if an inspector walked in tomorrow, across the five CQC key questions, that trends over time.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Monthly Audits"
      title="Your CQC Readiness Score"
      intro="A single score that shows how ready you would be if an inspector walked in tomorrow, and which CQC areas are strong or need attention."
      blocks={[
        { type: 'p', text: 'The CQC Readiness Score gives you an at-a-glance view of your compliance across the five CQC key questions, so you can focus on what needs attention before your next inspection, without waiting for an expensive one-off consultant visit.' },

        { type: 'subheading', text: 'What it is based on' },
        { type: 'bullets', items: [
          'How your completed monthly audits are performing, which is what is happening in practice.',
          'How well your policies cover the regulations, which is what is written down.',
        ] },
        { type: 'p', text: 'It combines both into a score for each CQC key question (Safe, Effective, Caring, Responsive, Well-led), and an overall score out of 100.' },

        { type: 'subheading', text: 'Where to find it' },
        { type: 'p', text: 'Once turned on, it appears at the top of your Audits page, and in the hub Audits tab for admins. You see the overall score, a colour-coded breakdown of the five domains, and a trend that builds up month by month so you can evidence improvement over time.' },

        { type: 'subheading', text: 'How to improve it' },
        { type: 'bullets', items: [
          'Complete your monthly audits honestly, especially the Single Assessment Framework Review.',
          'Act on the recommendations and close out your action plans.',
          'Keep your policies up to date and fill any gaps flagged on the Policy Gaps page.',
        ] },

        { type: 'subheading', text: 'Turning it on' },
        { type: 'p', text: 'The score is off by default to keep your view simple. To show it, go to Settings, then Audits, and switch on "Show the CQC Readiness Score". We keep measuring it in the background either way, so as soon as you turn it on your history is already there.' },

        { type: 'note', text: 'The Readiness Score is your own internal indicator to guide improvement. It is not a prediction of the rating CQC will give you.' },
      ]}
      related={[
        { title: 'How AI audit recommendations work', href: '/help/audits/ai-recommendations' },
        { title: 'Turning audits into an action plan', href: '/help/audits/action-plan' },
        { title: 'Policy gap detection, how it works', href: '/help/analytics/gap-detection' },
      ]}
    />
  )
}
