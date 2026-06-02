import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/privacy', {
    title: 'Privacy Policy | CareStream',
    description: 'How CareStream collects, uses and protects your data. Your information stays private to your organisation and is never used to train AI.',
  })
}

export default function Page() {
  return <ContentPage path="/privacy" title="Privacy Policy" />
}
