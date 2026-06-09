import { SettingPage } from '@/components/marketing/setting-page'
import { config } from '@/lib/settings/live-in-care'

export const metadata = {
  title: config.meta.title,
  description: config.meta.description,
  openGraph: {
    title: config.meta.title,
    description: config.meta.ogDescription,
    url: `https://carestreamai.com/${config.slug}`,
  },
}

export default function Page() {
  return <SettingPage config={config} />
}
