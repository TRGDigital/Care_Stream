import { HelpArticle, MockSecurity } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/security/retention', {
    title: 'Data Retention and Deletion | CareStream',
    description: 'How CareStream handles data retention and deletion. You stay in control of your information, including how long it is kept and how it can be removed.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Data and Security"
      title="Data retention and deletion"
      intro="You stay in control of your information, including how long it is kept and how it can be removed."
      mockup={<MockSecurity />}
      mockupCaption="You stay in control of your information"
      blocks={[
        { type: 'p', text: 'Your data belongs to you. You decide what to keep and what to remove, and we will always help if you need us to.' },
        { type: 'subheading', text: 'Keeping your records' },
        { type: 'p', text: 'Your policies and activity are kept while your account is active, so you always have your library and your records to hand for governance and inspection.' },
        { type: 'subheading', text: 'Removing data' },
        { type: 'bullets', items: [
          'You can archive or remove policies you no longer use.',
          'If you close your account, we will remove your data in line with our agreement with you.',
          'You can ask us about removing specific information at any time.',
        ] },
        { type: 'note', text: 'If you have a particular retention requirement, contact us and we will work with you.' },
      ]}
      related={[
        { title: 'Where is our data stored', href: '/help/security/data-storage' },
        { title: 'How data isolation works', href: '/help/security/data-isolation' },
        { title: 'Exporting your audit log', href: '/help/analytics/export-audit' },
      ]}
    />
  )
}
