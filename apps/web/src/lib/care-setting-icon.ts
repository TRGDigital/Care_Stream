// The care setting of a service, worked out from the free text "Facility Type" in Settings. MUST match facilityTypeToSetting in
// apps/api/src/lib/care-setting.ts (a test checks they agree). Used for the small icon beside the date on the dashboard.
export type SettingKey =
  | 'residential-care' | 'nursing-homes' | 'domiciliary-care' | 'live-in-care' | 'complex-care' | 'shared-lives'
  | 'substance-misuse' | 'hospices' | 'independent-hospitals' | 'gp-practices' | 'dental-practices'

export const SETTING_LABEL: Record<SettingKey, string> = {
  'residential-care': 'Residential care', 'nursing-homes': 'Nursing home', 'domiciliary-care': 'Home care', 'live-in-care': 'Live-in care',
  'complex-care': 'Complex care', 'shared-lives': 'Shared Lives', 'substance-misuse': 'Substance misuse service', 'hospices': 'Hospice',
  'independent-hospitals': 'Independent hospital', 'gp-practices': 'GP and primary care', 'dental-practices': 'Dental practice',
}

export function settingFromFacilityType(facilityType?: string | null): SettingKey {
  const t = (facilityType ?? '').toLowerCase()
  if (t.includes('dental')) return 'dental-practices'
  if (t.includes('hospice') || t.includes('palliative')) return 'hospices'
  if (t.includes('gp') || t.includes('surgery') || t.includes('primary care') || t.includes('practice')) return 'gp-practices'
  if (t.includes('hospital') || t.includes('clinic')) return 'independent-hospitals'
  if (t.includes('substance') || t.includes('rehab') || t.includes('detox') || t.includes('misuse')) return 'substance-misuse'
  if (t.includes('shared lives')) return 'shared-lives'
  if (t.includes('complex')) return 'complex-care'
  if (t.includes('live-in') || t.includes('live in')) return 'live-in-care'
  if (t.includes('nursing')) return 'nursing-homes'
  if (t.includes('domiciliary') || t.includes('home care') || t.includes('homecare')) return 'domiciliary-care'
  return 'residential-care'
}
