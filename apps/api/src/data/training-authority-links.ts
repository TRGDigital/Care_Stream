// External authority alignment for training topics heading to CPD assessment.
// Every topic carries the Skills for Care statutory and mandatory training guide
// (their Developing-your-workforce reference that sets expected content per
// subject) plus the topic's own authority where one exists. Shown on the
// standard-training marketing page and each module page, and cited in CPD
// submissions as evidence the content aligns to a recognised UK framework.
//
// Keyed by the exact topic title in training-topics.ts.

export type AuthorityLink = { label: string; url: string }

const SFC_STAT_MAND: AuthorityLink = {
  label: 'Skills for Care: statutory and mandatory training guide',
  url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf',
}

export const TOPIC_AUTHORITY_LINKS: Record<string, AuthorityLink[]> = {
  'Care Certificate': [
    { label: 'Skills for Care: Care Certificate standards (March 2025)', url: 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx' },
    { label: 'Skills for Care: Care Certificate assessor and employer guide', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Care-Certificate/Care-Certificate-Standards/Care-Certificate-assessor-and-employer-guide-March-2025.pdf' },
  ],
  'Food Hygiene': [
    SFC_STAT_MAND,
    { label: 'Food Standards Agency: online food safety training', url: 'https://www.food.gov.uk/business-guidance/online-food-safety-training' },
  ],
  'Mental Health Awareness': [
    SFC_STAT_MAND,
    { label: 'NHS England: mental health', url: 'https://www.england.nhs.uk/mental-health/' },
  ],
  'General Health & Safety Awareness': [
    SFC_STAT_MAND,
    { label: 'HSE: health and social care services', url: 'https://www.hse.gov.uk/healthservices/index.htm' },
  ],
  'Moving and Handling of People': [
    SFC_STAT_MAND,
    { label: 'HSE: moving and handling in health and social care', url: 'https://www.hse.gov.uk/healthservices/moving-handling/index.htm' },
  ],
  'Infection Prevention and Control': [
    SFC_STAT_MAND,
    { label: 'NHS England: national infection prevention and control manual', url: 'https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/' },
  ],
  'End of Life / Palliative Care': [
    SFC_STAT_MAND,
    { label: 'NICE NG142: end of life care for adults, service delivery', url: 'https://www.nice.org.uk/guidance/ng142' },
  ],
  'COSHH (Control of Substances Hazardous to Health)': [
    SFC_STAT_MAND,
    { label: 'HSE: COSHH, Control of Substances Hazardous to Health', url: 'https://www.hse.gov.uk/coshh/' },
  ],
  'Symptom Management in Palliative Care': [
    SFC_STAT_MAND,
    { label: 'NICE NG31: care of dying adults in the last days of life', url: 'https://www.nice.org.uk/guidance/ng31' },
  ],
  'Positive Behaviour Support / De-escalation': [
    SFC_STAT_MAND,
    { label: 'Restraint Reduction Network training standards', url: 'https://restraintreductionnetwork.org/know-the-standard/' },
  ],
}

export function authorityLinksFor(title: string): AuthorityLink[] {
  return TOPIC_AUTHORITY_LINKS[title] ?? []
}
