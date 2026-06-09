// Lightweight registry of the settings we serve, for the index page, footer and
// homepage. Kept free of the full page configs so it can be imported anywhere
// without pulling in all the setting page content.

export type SettingListItem = {
  slug: string
  label: string
  description: string
  iconKey: string
}

// Hero / card photography per setting (web-sized JPGs in public/images).
export const SETTING_IMAGES: Record<string, string> = {
  'residential-care':      '/images/residential-care.jpg',
  'nursing-homes':         '/images/nursing-home.jpg',
  'domiciliary-care':      '/images/domiciliary-care.jpg',
  'live-in-care':          '/images/live-in-care.jpg',
  'complex-care':          '/images/complex-care.jpg',
  'shared-lives':          '/images/shared-lives.jpg',
  'substance-misuse':      '/images/substance-misuse.jpg',
  'hospices':              '/images/hospices.jpg',
  'independent-hospitals': '/images/independent-hospitals.jpg',
  'gp-practices':          '/images/gp-practices.jpg',
  'dental-practices':      '/images/dental-practices.jpg',
}

export const SETTINGS_LIST: SettingListItem[] = [
  { slug: 'residential-care',      label: 'Residential Care Homes',                 description: '24/7 policy access for care assistants and seniors, in any language, with CQC evidence that builds itself.',     iconKey: 'home' },
  { slug: 'nursing-homes',         label: 'Nursing Homes',                          description: 'Clinical answers at the bedside for your mixed nursing and care team, in any language, on every shift.',          iconKey: 'stethoscope' },
  { slug: 'domiciliary-care',      label: 'Domiciliary Care',                       description: "Approved answers for lone care workers in your clients' homes, on any phone, in any language.",                 iconKey: 'mapPin' },
  { slug: 'live-in-care',          label: 'Live-in Care Providers',                 description: "A constant source of approved answers for carers working alone in a client's home.",                          iconKey: 'home' },
  { slug: 'complex-care',          label: 'Complex Care',                           description: 'Your clinical protocols and care plans, exactly as trained, for complex care delivered at home.',              iconKey: 'activity' },
  { slug: 'shared-lives',          label: 'Shared Lives Schemes',                   description: 'Consistent guidance for carers supporting an adult in their own family home.',                                iconKey: 'heart' },
  { slug: 'substance-misuse',      label: 'Substance Misuse and Rehabilitation',    description: 'Fast, clear answers from your own protocols for residential detox and rehabilitation teams.',                  iconKey: 'pill' },
  { slug: 'hospices',              label: 'Hospices',                               description: "Palliative and end-of-life answers from your policies for adult and children's hospice teams.",               iconKey: 'heart' },
  { slug: 'independent-hospitals', label: 'Independent Hospitals and Private Clinics', description: 'Clinical governance, consent and infection control, accessible to every clinician and agency worker.',       iconKey: 'building' },
  { slug: 'gp-practices',          label: 'GP Practices and Primary Care',          description: 'One place for the whole practice team to find the current policy, from reception to the consulting room.',     iconKey: 'stethoscope' },
  { slug: 'dental-practices',      label: 'Dental Practices',                       description: 'Decontamination, radiography and emergency answers for the whole dental team, between patients.',            iconKey: 'shield' },
]
