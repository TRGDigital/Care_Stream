import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'
import { isV2 } from '@/lib/v2-rollout'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/cookies', {
    title: 'Cookie Policy | CareStream',
    description: 'How CareStream uses cookies and similar technologies, the categories we use, and how you can manage your preferences.',
  })
}

export default async function Page(
  { searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams
  return <ContentPage path="/cookies" title="Cookie Policy" v2={await isV2('legal', sp)} />
}
