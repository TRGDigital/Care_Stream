import type { SettingPageConfig } from '@/components/marketing/setting-page'
import { previewParam } from '@/lib/preview'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The care-setting pages render from the database when a published row exists, and from the
// TypeScript config in this folder otherwise.
//
// The fallback is deliberate rather than defensive scaffolding. The copy has to be editable
// without a deploy, but a marketing page must never go blank because a row has not been seeded
// yet, someone left a page in draft, or the API is briefly unreachable. Worst case the page
// shows the wording that is in the code, which is what it shows today.
export async function settingConfigFromDb(
  slug: string,
  fallback: SettingPageConfig,
): Promise<SettingPageConfig> {
  try {
    const q = await previewParam()
    const res = await fetch(`${API_URL}/public/setting-pages/${slug}${q}`,
      q ? { cache: 'no-store' } : { next: { revalidate: 60 } })
    if (!res.ok) return fallback
    const body = await res.json()
    const cfg = body?.data?.page?.config
    // A row exists but its config is empty or malformed: prefer the code, which is known good.
    if (!cfg || typeof cfg !== 'object' || !cfg.hero?.h1) return fallback
    return cfg as SettingPageConfig
  } catch {
    return fallback
  }
}
