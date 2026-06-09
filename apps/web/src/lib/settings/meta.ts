import type { Metadata } from 'next'
import type { SettingPageConfig } from '@/components/marketing/setting-page'
import { pageMetadata } from '@/lib/page-meta'

// Setting page metadata, overridable from the platform console (Blog → Pages /
// site_pages), falling back to the page's own config when no record is set.
export function settingPageMetadata(config: SettingPageConfig): Promise<Metadata> {
  return pageMetadata(`/${config.slug}`, {
    title:       config.meta.title,
    description: config.meta.description,
  })
}
