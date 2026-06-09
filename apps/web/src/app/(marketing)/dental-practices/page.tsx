import { SettingPage } from '@/components/marketing/setting-page'
import { config } from '@/lib/settings/dental-practices'
import { settingPageMetadata } from '@/lib/settings/meta'

export const generateMetadata = () => settingPageMetadata(config)

export default function Page() {
  return <SettingPage config={config} />
}
