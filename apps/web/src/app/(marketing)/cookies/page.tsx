import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/cookies', {
    title: 'Cookie Policy | CareStream',
    description: 'How CareStream uses cookies and similar technologies, the categories we use, and how you can manage your preferences.',
  })
}

export default function Page() {
  return <ContentPage path="/cookies" title="Cookie Policy" />
}
