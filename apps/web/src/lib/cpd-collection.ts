import { type Offer } from './offer-rules'
import { UNIT_PENCE } from './training-commerce'
import { bundleQuote as sharedQuote, type BundleKey } from './bundle-rules'

// The CPD courses collection page (/staff-training/cpd-courses): the landing page for the two CPD
// category Google Ads campaigns (cpd-keyword-tool slugs cpd-high-intent and cpd-wider-reach).
// Every ad group lands on a ?intent= version below; the keys must match the tool's plan
// (scripts/cpd_category_plan.py PAGES), since the Final URLs are built from them.
//
// Bundles (Len, 2026-10-08): best price wins. Nothing stacks on a bundle: the buyer pays the
// bundle price or what the same courses cost as single licences under the live offer and team
// discount, whichever is lower.

export type CpdCourse = {
  slug: string
  title: string
  short: string
  minutes: number
  practical: boolean
  image: string | null
  newStarter?: boolean
}

// Titles as certified (cpd-certified/page.tsx) and a one line summary for the card.
export const CPD_COURSE_INFO: Record<string, { title: string; short: string }> = {
  'care-certificate': { title: 'Care Certificate', short: 'All 16 standards for new carers, with an observed practical checklist.' },
  'moving-and-handling-of-people': { title: 'Moving and Handling of People', short: 'Safe moving and handling, equipment and risk, with a practical checklist.' },
  'infection-prevention-and-control': { title: 'Infection Prevention and Control', short: 'Hand hygiene, PPE, outbreaks and cleaning in care settings.' },
  'medication-administration-and-competency': { title: 'Medication Administration', short: 'Safe administration, records and errors, with a practical checklist.' },
  'food-hygiene': { title: 'Food Hygiene', short: 'Storage, cross contamination and allergens for carers who handle food.' },
  'general-health-and-safety-awareness': { title: 'Health and Safety Awareness', short: 'Risk, reporting and keeping people safe at work in care.' },
  'end-of-life-palliative-care': { title: 'End of Life and Palliative Care', short: 'Comfort, dignity and supporting families at the end of life.' },
  'mental-health-awareness': { title: 'Mental Health Awareness', short: 'Recognising and supporting mental health in the people you care for.' },
  'coshh-control-of-substances-hazardous-to-health': { title: 'COSHH', short: 'Safe use and storage of hazardous substances in care settings.' },
  'gdpr-data-protection': { title: 'GDPR and Data Protection', short: 'Handling personal information safely and confidentially.' },
}
export const CPD_SLUGS = Object.keys(CPD_COURSE_INFO)
export const REFRESHER_SLUGS = CPD_SLUGS.filter(s => s !== 'care-certificate')

// Bundles and their price live in bundle-rules.ts (shared with the API, so checkout charges the
// same). bundleQuote here is that, at the shop's licence price.
export { BUNDLES, type BundleKey } from './bundle-rules'
export function bundleQuote(offers: Offer[], key: BundleKey, learners: number) {
  const q = sharedQuote(offers, key, learners, UNIT_PENCE)
  return { ...q, pence: q.total, listPence: q.listTotal }
}

// ─── Page versions (?intent=) ─────────────────────────────────────────────────
// feature: the course shown first and highlighted. chip: the filter the grid opens on.
export type CpdIntent = { tag: string; headline: string; sub: string; feature?: string; chip?: Chip; bundle?: BundleKey }
export type Chip = 'all' | 'refreshers' | 'starters' | 'practical'

const SUB = 'Ten short courses built for care settings, each with a CPD Certified certificate for every learner. Buy one course, or a bundle for the whole team.'

export const CPD_INTENTS: Record<string, CpdIntent> = {
  '':                 { tag: 'CPD Certified', headline: 'CPD Certified mandatory training for care staff', sub: SUB },
  mandatory:          { tag: 'Mandatory training', headline: 'CPD Certified mandatory training for care workers', sub: SUB },
  cqc:                { tag: 'CQC evidence', headline: 'Mandatory training with the evidence CQC asks to see', sub: 'Every learner gets a named, dated, CPD Certified certificate, and your dashboard shows who is up to date before an inspection.' },
  'skills-for-care':  { tag: 'Core and mandatory', headline: 'Core and mandatory training for care staff, following national guidance', sub: 'Built around the statutory and mandatory training care workers are expected to have, with a CPD Certified certificate for each course.' },
  'care-homes':       { tag: 'For care homes', headline: 'CPD Certified training for your care home staff', sub: 'Train the whole home at once, in short lessons staff can take on a phone between shifts, and see who has finished from one dashboard.' },
  'home-care':        { tag: 'For home care', headline: 'CPD Certified training for home care and domiciliary staff', sub: 'Short lessons carers can take on a phone between visits, with a certificate for each course and a record you can show CQC.' },
  'supported-living': { tag: 'For support workers', headline: 'Mandatory training for support workers and supported living teams', sub: 'The same ten CPD Certified courses, written for every care setting, on any phone, in over 60 languages.' },
  providers:          { tag: 'Only care', headline: 'A CPD Certified training provider that only works in care', sub: 'Every course is written for care settings, certified by The CPD Certification Service, and taught in over 60 languages.' },
  cpd:                { tag: 'CPD Certified', headline: 'CPD Certified courses for health and social care staff', sub: 'Certified by The CPD Certification Service, with the CPD mark and CPD hours on every learner’s certificate.' },
  'care-workers':     { tag: 'For care workers', headline: 'Online training courses for care workers', sub: 'Ten short, scenario based courses, about an hour each, with a CPD Certified certificate when you pass.' },
  'moving-handling':  { tag: 'Moving and handling', headline: 'Moving and handling training for carers', sub: 'Safe moving and handling for care staff, with a practical checklist your manager signs off. Add the other nine courses and save with a bundle.', feature: 'moving-and-handling-of-people', bundle: 'refresher' },
  medication:         { tag: 'Medication', headline: 'Medication training for carers, online', sub: 'Safe administration, records and errors, with a practical checklist for observation and a CPD Certified certificate.', feature: 'medication-administration-and-competency', bundle: 'refresher' },
  'health-safety':    { tag: 'Health and safety', headline: 'Health and safety training for care workers', sub: 'Health and safety written for care settings, about an hour on any phone, with a CPD Certified certificate.', feature: 'general-health-and-safety-awareness', bundle: 'refresher' },
  'health-social-care': { tag: 'Short CPD courses', headline: 'Short CPD Certified courses in health and social care', sub: 'For people working in care: about an hour each, on any phone. These are CPD courses, not diplomas or qualifications.' },
  'health-care':      { tag: 'Interactive lessons', headline: 'Interactive online health care training for care staff', sub: 'Real care scenarios, quick checks after every lesson and a CPD Certified certificate at the end.' },
  'care-training':    { tag: 'Online care training', headline: 'Online care training, CPD Certified', sub: SUB },
  carers:             { tag: 'For carers', headline: 'Online courses for carers, with a certificate for each', sub: 'About an hour each on any phone, in over 60 languages, with a CPD Certified certificate when you pass.' },
  'new-starters':     { tag: 'New starters', headline: 'Everything a new carer needs: the Care Certificate and 9 more courses', sub: 'The Complete CPD bundle gives a new carer the Care Certificate and all nine mandatory courses, each CPD Certified.', chip: 'starters', bundle: 'complete' },
  requirements:       { tag: 'What staff need', headline: 'The mandatory training care workers need, in one place', sub: 'See which courses each role needs, then buy them one at a time or as a bundle. Every course is CPD Certified.' },
  bundles:            { tag: 'Bundles', headline: 'Two CPD bundles: every course for new starters, or the annual refreshers', sub: 'One price per learner for a whole year of mandatory training. You always get the best price, offer or bundle.' },
  refreshers:         { tag: 'Annual refreshers', headline: 'Your team’s annual mandatory refreshers in one bundle', sub: 'All nine annual refreshers for each member of staff, at one price per learner.', chip: 'refreshers', bundle: 'refresher' },
  price:              { tag: 'Team prices', headline: 'CPD Certified care training for your whole team, with team prices', sub: 'Up to 40% off single courses for larger teams, or a bundle price per learner. No subscription.' },
  languages:          { tag: '60+ languages', headline: 'Mandatory training in your staff’s own language', sub: 'Every lesson in over 60 languages, including Polish, Romanian and Hindi, so staff understand it, not just pass it.' },
  certificates:       { tag: 'Certificates', headline: 'A CPD Certified certificate for every learner, every course', sub: 'Named, dated and downloadable, with the CPD mark and CPD hours, ready for supervision and CQC.' },
  quote:              { tag: 'Several homes', headline: 'CPD Certified training for a large team or several homes', sub: 'Ask for a quote, pay by invoice if you prefer, and see who has finished in every service from one dashboard.' },
}
export const intentFor = (k?: string | null): CpdIntent => CPD_INTENTS[k ?? ''] ?? CPD_INTENTS['']
