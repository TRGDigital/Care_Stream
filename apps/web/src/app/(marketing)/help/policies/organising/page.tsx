import { HelpArticle, MockPolicyLibrary } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/policies/organising', {
    title: 'Organising Your Policy Library | CareStream',
    description: 'How to keep your CareStream policy library tidy with clear categories and names, so staff find what they need and you can spot any gaps.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Policy Management"
      title="Organising your policy library"
      intro="A tidy policy library helps staff find what they need and helps you spot any gaps. Here is how to keep it organised."
      mockup={<MockPolicyLibrary />}
      mockupCaption="A well organised policy library"
      blocks={[
        { type: 'p', text: 'As your library grows, a little organisation goes a long way. Categories and clear names make everything easier to manage.' },
        { type: 'subheading', text: 'Use categories' },
        { type: 'p', text: 'Group your documents by type, such as internal policy, staff handbook or CQC report. This makes the library easier to scan and keeps related documents together.' },
        { type: 'subheading', text: 'Name policies clearly' },
        { type: 'bullets', items: [
          'Use the name your team would recognise, such as Safeguarding Adults Policy.',
          'Avoid file codes or version numbers in the name, as the version is tracked separately.',
          'Keep one subject per document.',
        ] },
        { type: 'note', text: 'A well organised library also makes the gap report easier to act on, as you can quickly see what you already have.' },
      ]}
      related={[
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
        { title: 'Policy gap detection, how it works', href: '/help/analytics/gap-detection' },
        { title: 'Supported document formats', href: '/help/policies/formats' },
      ]}
    />
  )
}
