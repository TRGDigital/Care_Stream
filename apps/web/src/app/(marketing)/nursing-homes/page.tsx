import { SettingPage } from '@/components/marketing/setting-page'
import { config } from '@/lib/settings/nursing-homes'
import { settingPageMetadata } from '@/lib/settings/meta'

export const generateMetadata = () => settingPageMetadata(config)

// searchParams so ?v2=1 can preview the rebuilt theme on the real page with its real
// content. Without it the live page renders exactly as before.
export default async function Page(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams
  return <SettingPage config={config} v2={sp?.v2 === '1'} />
}
