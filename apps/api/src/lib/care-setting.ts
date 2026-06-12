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

// Per-setting voice/scenario/regulatory guidance, appended to the training-module
// generation prompt so a generated module fits the setting (right terminology,
// scenarios and standards). Enriched per setting as each one is built out.
type SettingGuidance = { audience: string; scenarios: string; standards: string }

const SETTING_GUIDANCE: Partial<Record<CareSetting, SettingGuidance>> = {
  'dental-practices': {
    audience: "the dental team (dentists, dental nurses, hygienists, therapists, receptionists) in a dental practice; call the people served “patients” (never “residents”) and refer to “our practice”",
    scenarios: "realistic dental-practice situations — between patients, in the decontamination/local decontamination unit (LDU), in surgery, at reception, during recall appointments",
    standards: "GDC Standards for the Dental Team, CQC fundamental standards, HTM 01-05 (decontamination), IR(ME)R 2017 and IRR17 (dental radiography), COSHH (mercury/amalgam) and RIDDOR",
  },
}

// Returns a SETTING CONTEXT block to append to the generation prompt. NULL/unknown
// produces a setting-NEUTRAL block (the universal cross-over voice).
export function settingGenerationContext(setting: string | null | undefined): string {
  if (!setting || !isCareSetting(setting)) {
    return `\n\nSETTING CONTEXT — write for a general UK health & social care service, setting-NEUTRAL. Refer to “our service” and “the people we support” rather than “care home”/“residents” or any one setting's terminology. Use scenarios and wording that apply across care settings. Ground regulatory content in CQC fundamental standards and broadly-applicable UK good practice.`
  }
  const label = SETTING_LABELS[setting]
  const g = SETTING_GUIDANCE[setting]
  if (!g) {
    return `\n\nSETTING CONTEXT — write specifically for ${label}. Use the voice, terminology, scenarios and regulatory framework appropriate to ${label}; do NOT use generic care-home language (“our home”, “residents”) unless it genuinely applies to ${label}.`
  }
  return `\n\nSETTING CONTEXT — write specifically for ${label}. Audience and voice: ${g.audience}. Scenarios: ${g.scenarios}. Ground regulatory and clinical content in: ${g.standards}. Do NOT use care-home language (“our home”, “residents”) — this is ${label}.`
}
