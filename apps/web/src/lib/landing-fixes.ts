// Landing page fixes for the 13 Google Ads ad groups rated "Below average" on landing page
// experience (audit of 12 Oct 2026). Page side only: copy per ?intent=, plus a few small blocks
// that put what the ad promised on the first phone screen, in BOTH Test 1 variants.
//
// The review highlight: on a preview (never on production), add ?lfdemo=1 to a course or CPD
// collection URL and every new or changed element gets a yellow background and a small label
// (landing-fixes.css, keyed off the data-lf attribute). Without ?lfdemo=1 the page shows exactly
// as it would ship. Production ignores the parameter (NEXT_PUBLIC_LF_DEMO is empty there, set in
// next.config.mjs from VERCEL_ENV), so it can never show yellow. The attributes are harmless when
// left in; nothing needs stripping out before this ships.

/** True where the ?lfdemo=1 review highlight may be switched on: previews and local builds only. */
export const LF_DEMO_ALLOWED = process.env.NEXT_PUBLIC_LF_DEMO === '1'

/** The attributes that mark an element for the ?lfdemo=1 highlight. */
export function lf(key: string, label: string): Record<string, string> {
  return { 'data-lf': key, 'data-lf-label': `Changed: ${label}` }
}

/** Care Certificate ?intent= versions whose tag, headline or sub line this batch rewrote, so the
 *  highlight marks them. Copy itself lives in course-cro.ts and course-cro-sitelinks.ts. */
export const CHANGED_CC_INTENTS = new Set([
  'price', 'cqc',
  'cqc-requirement', 'cqc-mandatory', 'twelve-weeks', 'common-induction', 'cpd-online', 'sample-certificate', 'hca',
  'adult-social-care', 'online', 'care-assistant', 'support-workers', 'carers', 'social-care', 'st-for-staff',
  'online-cert', 'hca-online', 'cpd-mark', 'acc-online', 'hc-cert-online', 'hsc-induction', 'ca-first-weeks',
  'sw-health', 'cw-course', 'course', 'national', 'equivalent', 'elderly', 'ag-certificate', 'ag-online-1',
  'ag-online-2', 'ag-online-5', 'ag-care-assistants', 'ag-care-staff', 'ag-support-workers', 'ag-carers',
  'ag-care-workers', 'ag-course-1', 'ag-course-3', 'ag-modules', 'ag-skills-for-care', 'ag-core-1', 'ag-core-2',
  'ag-core-3', 'ag-core-4', 'ag-core-8', 'ag-mandatory',
])

/** CPD collection ?intent= versions rewritten in this batch. */
export const CHANGED_CPD_INTENTS = new Set([
  'mandatory-training-list', 'care-worker-training-courses', 'mandatory-care-workers', 'online-courses-for-carers',
  'care-workers', 'carers',
])

/** The core term ad groups (ag-core-1 to 12): people who typed just "care certificate" want to
 *  know what it is before they see a checkout, so these open on a short "What is it?" block. */
export const isCoreIntent = (k?: string) => !!k && /^ag-core-\d+$/.test(k)

/** CPD Certified proof (logo, provider number, listing link) on the first screen. */
export const isCpdIntent = (k?: string) => !!k && /^(cpd|cpd-certified|cpd-hours|cpd-mark|cpd-online|accredited|acc-online)$/.test(k)

/** The care topics care workers are usually expected to cover, from our own guide "Mandatory
 *  Training for Care Staff: The Full List and How Often to Refresh" (blog), and the CareStream
 *  CPD course that covers each, where there is one. LEN TO CONFIRM this list. */
export const EXPECTED_TOPICS: { topic: string; course?: string }[] = [
  { topic: 'Moving and handling', course: 'moving-and-handling-of-people' },
  { topic: 'Infection prevention and control', course: 'infection-prevention-and-control' },
  { topic: 'Medication management', course: 'medication-administration-and-competency' },
  { topic: 'Food hygiene', course: 'food-hygiene' },
  { topic: 'Health and safety', course: 'general-health-and-safety-awareness' },
  { topic: 'Data protection and GDPR', course: 'gdpr-data-protection' },
  { topic: 'Fire safety' },
  { topic: 'First aid' },
  { topic: 'Basic life support' },
  { topic: 'Safeguarding adults and children' },
  { topic: 'Mental Capacity Act and DoLS' },
  { topic: 'Communication, dignity, equality and diversity' },
]
