import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/dpa', {
    title: 'Data Processing Agreement | CareStream',
    description: 'CareStream Data Processing Agreement for subscribers. UK GDPR compliant, with all data stored in the UK and EEA.',
  })
}

export default function Page() {
  return <ContentPage path="/dpa" title="Data Processing Agreement" />
}
