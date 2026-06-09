import { SettingPage } from '@/components/marketing/setting-page'
import { config } from '@/lib/settings/substance-misuse'
import { settingPageMetadata } from '@/lib/settings/meta'

export const generateMetadata = () => settingPageMetadata(config)

export default function Page() {
  return <SettingPage config={config} />
}
