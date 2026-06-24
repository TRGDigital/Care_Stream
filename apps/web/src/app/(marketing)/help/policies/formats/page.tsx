import { HelpArticle, MockUpload } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/policies/formats', {
    title: 'Supported Document Formats | CareStream',
    description: 'The document types you can upload to CareStream, including PDF, Word and plain text, plus tips for getting the best results from your policies.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Policy Management"
      title="Supported document formats"
      intro="CareStreamAI accepts the document types most care settings already use. Here is what you can upload."
      mockup={<MockUpload />}
      mockupCaption="Uploading a document in your portal"
      blocks={[
        { type: 'subheading', text: 'Formats you can upload' },
        { type: 'bullets', items: [
          'PDF documents',
          'Microsoft Word documents',
          'Plain text files',
        ] },
        { type: 'p', text: 'Most policies, staff handbooks and procedure documents are already in one of these formats, so you can usually upload them as they are.' },
        { type: 'subheading', text: 'Getting the best results' },
        { type: 'bullets', items: [
          'Upload documents that contain real text rather than scanned images of text, so the content can be read clearly.',
          'If a policy is made up of scanned pages, save it as a searchable PDF first.',
          'Keep each policy as its own document so staff get focused answers.',
        ] },
        { type: 'note', text: 'If you are unsure whether a document will work, upload it and check, or contact support and we will help.' },
      ]}
      related={[
        { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
        { title: 'Organising your policy library', href: '/help/policies/organising' },
        { title: 'How to update a policy', href: '/help/policies/update-policy' },
      ]}
    />
  )
}
