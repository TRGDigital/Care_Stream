// Care-setting taxonomy. Seeds, onboarding templates, training topics + modules are
// tagged by setting so a tenant's content is grounded in the right kind of service.
// Keys are aligned 1:1 with the marketing /who-we-serve slugs (apps/web
// settings/list.ts) so the DB, the console setting tabs and the marketing site all
// speak the same language. NULL on a row = universal (applies to every setting).

export const CARE_SETTINGS = [
  'residential-care',
  'nursing-homes',
  'domiciliary-care',
  'live-in-care',
  'complex-care',
  'shared-lives',
  'substance-misuse',
  'hospices',
  'independent-hospitals',
  'gp-practices',
  'dental-practices',
] as const
export type CareSetting = (typeof CARE_SETTINGS)[number]

// Human labels (kept short for console tabs; mirror the marketing labels).
export const SETTING_LABELS: Record<CareSetting, string> = {
  'residential-care':      'Residential Care',
  'nursing-homes':         'Nursing Homes',
  'domiciliary-care':      'Domiciliary Care',
  'live-in-care':          'Live-in Care',
  'complex-care':          'Complex Care',
  'shared-lives':          'Shared Lives',
  'substance-misuse':      'Substance Misuse & Rehab',
  'hospices':              'Hospices',
  'independent-hospitals': 'Independent Hospitals',
  'gp-practices':          'GP & Primary Care',
  'dental-practices':      'Dental Practices',
}

export function isCareSetting(v: unknown): v is CareSetting {
  return typeof v === 'string' && (CARE_SETTINGS as readonly string[]).includes(v)
}

// Display label for a setting value (NULL/unknown = the universal layer).
export function settingLabel(s: string | null | undefined): string {
  return s && isCareSetting(s) ? SETTING_LABELS[s] : 'All settings'
}

// Label used inside AI generation prompts. NULL (universal content) deliberately
// resolves to a setting-neutral phrase so cross-over modules don't read as
// care-home specific ("our home" → "our service").
export function settingLabelForPrompt(s: string | null | undefined): string {
  return s && isCareSetting(s) ? SETTING_LABELS[s] : 'health and social care service'
}

// Map a tenant's free-text facility_type (set at signup) to a canonical setting.
// Ordered most-specific first; unknown defaults to residential-care (the most
// common setting in the customer base).
export function facilityTypeToSetting(facilityType?: string | null): CareSetting {
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
  if (t.includes('residential') || t.includes('care home') || t.includes('care')) return 'residential-care'
  return 'residential-care'
}

// Clinically-similar neighbours used to fall back when a setting has no seeded
// content yet, so generation never breaks. Every chain ends at nursing-homes /
// residential-care, which hold the bulk of the seeded policies.
const SETTING_NEIGHBOURS: Record<CareSetting, CareSetting[]> = {
  'residential-care':      [],
  'nursing-homes':         [],
  'domiciliary-care':      ['residential-care'],
  'live-in-care':          ['domiciliary-care', 'residential-care'],
  'complex-care':          ['nursing-homes'],
  'shared-lives':          ['residential-care'],
  'substance-misuse':      ['residential-care'],
  'hospices':              ['nursing-homes'],
  'independent-hospitals': ['nursing-homes'],
  'gp-practices':          ['residential-care'],
  'dental-practices':      ['gp-practices', 'residential-care'],
}

export function settingFallbackOrder(setting: CareSetting): CareSetting[] {
  const chain: CareSetting[] = [setting, ...(SETTING_NEIGHBOURS[setting] ?? []), 'nursing-homes', 'residential-care']
  return [...new Set(chain)]
}
