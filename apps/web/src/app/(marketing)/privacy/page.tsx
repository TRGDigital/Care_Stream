import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'
import { isV2 } from '@/lib/v2-rollout'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/privacy', {
    title: 'Privacy Policy | CareStream',
    description: 'How CareStream collects, uses and protects your data. Your information stays private to your organisation and is never used to train AI.',
  })
}

export default async function Page(
  { searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams
  return <ContentPage path="/privacy" title="Privacy Policy" v2={await isV2('legal', sp)} />
}
