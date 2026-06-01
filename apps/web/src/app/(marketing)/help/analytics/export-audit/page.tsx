import { HelpArticle, MockAnalytics } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/analytics/export-audit', {
    title: 'Exporting Your Audit Log | CareStream',
    description: 'How to export your CareStream audit log for a chosen period, giving you a clear record of activity for governance and for CQC inspection.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Analytics and Reporting"
      title="Exporting your audit log"
      intro="Your audit log records activity in your account. You can export it whenever you need a record to keep or share."
      mockup={<MockAnalytics />}
      mockupCaption="Activity records in your portal"
      blocks={[
        { type: 'p', text: 'The audit log gives you a clear record of activity, which is helpful for your own governance and for inspection.' },
        { type: 'subheading', text: 'How to export' },
        { type: 'steps', items: [
          'Open the Analytics area and find the audit log.',
          'Choose the period you want to export.',
          'Download the log to save or share.',
        ] },
        { type: 'subheading', text: 'What it helps with' },
        { type: 'bullets', items: [
          'Showing inspectors that staff are engaging with policies.',
          'Keeping your own records for governance.',
          'Reviewing activity over a chosen period.',
        ] },
      ]}
      related={[
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Generating a CQC Readiness Report', href: '/help/analytics/cqc-report' },
        { title: 'Data retention and deletion', href: '/help/security/retention' },
      ]}
    />
  )
}
