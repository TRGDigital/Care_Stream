// Which of the ten free CPD certified courses support which audit, by audit name. Shown on every audit page
// and, in the app, after an audit is completed: "train your team on what failed". The courses are free on
// every plan (see lib/free-cpd.ts), so this works for every account.

export interface CpdCourse { slug: string; title: string; blurb: string }

export const CPD_COURSES: Record<string, CpdCourse> = {
  'care-certificate': { slug: 'care-certificate', title: 'Care Certificate', blurb: 'The 16 Care Certificate standards, including safeguarding, dignity, person-centred care and communication.' },
  'coshh-control-of-substances-hazardous-to-health': { slug: 'coshh-control-of-substances-hazardous-to-health', title: 'COSHH', blurb: 'Handling, storing and recording hazardous substances safely.' },
  'end-of-life-palliative-care': { slug: 'end-of-life-palliative-care', title: 'End of Life and Palliative Care', blurb: 'Caring for people at the end of life, and supporting their families.' },
  'food-hygiene': { slug: 'food-hygiene', title: 'Food Hygiene', blurb: 'Safe food handling, storage, temperatures and allergens.' },
  'gdpr-data-protection': { slug: 'gdpr-data-protection', title: 'GDPR and Data Protection', blurb: 'Keeping personal and care records lawful, accurate and confidential.' },
  'general-health-and-safety-awareness': { slug: 'general-health-and-safety-awareness', title: 'Health and Safety Awareness', blurb: 'Everyday health and safety, fire safety and reporting hazards.' },
  'infection-prevention-and-control': { slug: 'infection-prevention-and-control', title: 'Infection Prevention and Control', blurb: 'Hand hygiene, PPE, cleaning, laundry and waste.' },
  'medication-administration-and-competency': { slug: 'medication-administration-and-competency', title: 'Medication Administration and Competency', blurb: 'Giving, recording and storing medicines safely.' },
  'mental-health-awareness': { slug: 'mental-health-awareness', title: 'Mental Health Awareness', blurb: 'Understanding mental health, risk and supporting people well.' },
  'moving-and-handling-of-people': { slug: 'moving-and-handling-of-people', title: 'Moving and Handling of People', blurb: 'Safe moving and handling, hoists, slings and equipment.' },
}

// First matching rules win; at most two courses per audit. An audit that matches nothing gets no panel.
const RULES: Array<[RegExp, string]> = [
  [/infection|hand hygiene|sharps|decontamination|waterline|laundry|\bppe\b|clinical waste/i, 'infection-prevention-and-control'],
  [/medic|mar chart|controlled drugs|syringe|psychotropic|tranquillis|opioid|self-admin|prescrib|antimicrobial|fridge/i, 'medication-administration-and-competency'],
  [/moving|hoist|handling|bed rails|falls/i, 'moving-and-handling-of-people'],
  [/coshh/i, 'coshh-control-of-substances-hazardous-to-health'],
  [/health (&|and) safety|fire|premises|lone working|water safety|legionella|ligature|equipment|oxygen|medical gases|business continuity|bedroom|accident|incident/i, 'general-health-and-safety-awareness'],
  [/gdpr|record keeping|information sharing/i, 'gdpr-data-protection'],
  [/kitchen|mealtime|food|nutrition|malnutrition|fluid/i, 'food-hygiene'],
  [/end of life|bereavement|dnacpr|palliative|hospice|advance care/i, 'end-of-life-palliative-care'],
  [/mental health|mha|observation|restraint|seclusion|safety planning|positive behaviour|discharge|detox|metabolic|missing from care/i, 'mental-health-awareness'],
  [/safeguard|dignity|care plan|support plan|daily care notes|person-centred|capacity|money|supervision|competency|training matrix|spot check|resident of the day|chaperone|health action/i, 'care-certificate'],
]

export function trainingForAudit(name: string): CpdCourse[] {
  const out: CpdCourse[] = []
  for (const [re, slug] of RULES) {
    if (re.test(name) && !out.some(c => c.slug === slug)) out.push(CPD_COURSES[slug])
    if (out.length >= 2) break
  }
  return out
}
