import { HelpArticle, MockUpload } from '@/components/marketing/help'

export const metadata = {
  title: 'Uploading your first policy',
  description: 'How to upload a policy to CareStreamAI so your whole team can ask questions about it. Supports PDF, Word and plain text documents.',
}

export default function Page() {
  return (
    <HelpArticle
      category="Getting Started"
      title="Uploading your first policy"
      intro="Uploading a policy makes it instantly available to your whole team. Here is how to add your first document."
      mockup={<MockUpload />}
      mockupCaption="The upload screen in your portal"
      blocks={[
        { type: 'p', text: 'Your policy library is the set of documents your staff can ask questions about. The more of your real policies you add, the more useful CareStreamAI becomes.' },
        { type: 'subheading', text: 'How to upload a policy' },
        { type: 'steps', items: [
          'Open the Policies area in your portal and click Upload policy.',
          'Select a file from your computer. You can upload PDF, Word or plain text documents.',
          'Give the policy a clear name your team will recognise, such as Medication Management Policy.',
          'Choose a category so the document is easy to find later.',
          'Click save. Your policy is ready for staff to ask about within moments.',
        ] },
        { type: 'subheading', text: 'Tips for good results' },
        { type: 'bullets', items: [
          'Upload the current version of each policy so answers reflect your latest practice.',
          'Use clear, familiar names rather than file codes.',
          'Add your most asked about policies first, such as medication, safeguarding and infection control.',
        ] },
        { type: 'note', text: 'You can upload as many policies as you like on any plan. There is no limit on documents.' },
      ]}
      related={[
        { title: 'Supported document formats', href: '/help/policies/formats' },
        { title: 'Organising your policy library', href: '/help/policies/organising' },
        { title: 'Inviting staff to use CareStreamAI', href: '/help/getting-started/invite-staff' },
      ]}
    />
  )
}
