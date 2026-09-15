import { SettingPage } from '@/components/marketing/setting-page'
import { config } from '@/lib/settings/domiciliary-care'
import { settingPageMetadata } from '@/lib/settings/meta'
import { settingConfigFromDb } from '@/lib/settings/db'

export const generateMetadata = () => settingPageMetadata(config)

// searchParams so ?v2=1 can preview the rebuilt theme on the real page with its real
// content. Without it the live page renders exactly as before.
export default async function Page(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams
  // Copy comes from the database so it can be edited in the console; the config in
  // lib/settings is the fallback when no published row exists.
  const live = await settingConfigFromDb(config.slug, config)
  return <SettingPage config={live} v2={sp?.v2 === '1'} />
}
