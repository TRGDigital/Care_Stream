import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'
import { isV2 } from '@/lib/v2-rollout'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/dpa', {
    title: 'Data Processing Agreement | CareStream',
    description: 'CareStream Data Processing Agreement for subscribers. UK GDPR compliant, with all data stored in the UK and EEA.',
  })
}

export default async function Page(
  { searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams
  return <ContentPage path="/dpa" title="Data Processing Agreement" v2={await isV2('legal', sp)} />
}
