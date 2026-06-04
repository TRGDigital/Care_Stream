// Care-setting taxonomy. Seeds + templates are tagged by setting so a tenant's
// onboarding/training content is grounded in policies for THEIR kind of home.

export const CARE_SETTINGS = ['nursing_home', 'care_home', 'home_care', 'other'] as const
export type CareSetting = (typeof CARE_SETTINGS)[number]

export function isCareSetting(v: unknown): v is CareSetting {
  return typeof v === 'string' && (CARE_SETTINGS as readonly string[]).includes(v)
}

// Map a tenant's free-text facility_type (set at signup) to a canonical setting.
export function facilityTypeToSetting(facilityType?: string | null): CareSetting {
  const t = (facilityType ?? '').toLowerCase()
  if (t.includes('nursing')) return 'nursing_home'
  if (t.includes('home care') || t.includes('domiciliary')) return 'home_care'
  if (t.includes('care') || t.includes('residential')) return 'care_home'
  return 'other'
}

// When a setting has no seeds yet (e.g. home_care), fall back to the nearest one
// with content so generation never breaks. Ordered by clinical similarity.
export function settingFallbackOrder(setting: CareSetting): CareSetting[] {
  switch (setting) {
    case 'nursing_home': return ['nursing_home', 'care_home']
    case 'care_home':    return ['care_home', 'nursing_home']
    case 'home_care':    return ['home_care', 'care_home', 'nursing_home']
    default:             return ['other', 'care_home', 'nursing_home']
  }
}
