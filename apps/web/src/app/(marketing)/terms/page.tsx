import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/terms', {
    title: 'Terms of Service | CareStream',
    description: 'The terms governing your use of CareStream, covering subscriptions, acceptable use, data responsibilities and service commitments.',
  })
}

export default function Page() {
  return <ContentPage path="/terms" title="Terms of Service" />
}
