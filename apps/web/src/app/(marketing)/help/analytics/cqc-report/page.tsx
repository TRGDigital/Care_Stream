import { HelpArticle, MockCqcReport } from '@/components/marketing/help'

export const metadata = {
  title: { absolute: 'Generating a CQC Readiness Report | CareStream' },
  description: 'How to generate and download a CQC Readiness Report in CareStream, bringing your evidence across the five key questions together in one document.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Analytics and Reporting"
      title="Generating a CQC Readiness Report"
      intro="The CQC Readiness Report gathers evidence across the five key questions into one document you can download."
      mockup={<MockCqcReport />}
      mockupCaption="The CQC Readiness Report in your portal"
      blocks={[
        { type: 'p', text: 'The CQC Readiness Report helps you prepare for inspection by bringing your evidence together in one place.' },
        { type: 'subheading', text: 'How to generate the report' },
        { type: 'steps', items: [
          'Open the Analytics area and choose the CQC Readiness Report.',
          'Review the summary across the five key questions.',
          'Download the report as a PDF to share with your team or keep on file.',
        ] },
        { type: 'subheading', text: 'What the report shows' },
        { type: 'bullets', items: [
          'Evidence organised under the five key questions.',
          'How your team is engaging with your policies.',
          'Areas that may need attention before an inspection.',
        ] },
        { type: 'note', text: 'The report is a preparation tool and helps you get ready. It does not predict or guarantee a rating.' },
      ]}
      related={[
        { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
        { title: 'Policy gap detection, how it works', href: '/help/analytics/gap-detection' },
        { title: 'Exporting your audit log', href: '/help/analytics/export-audit' },
      ]}
    />
  )
}
