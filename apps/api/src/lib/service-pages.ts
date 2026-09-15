// The seven /our-services pages, by their LIVE flat slug.
//
// The rebuilt theme groups these under /our-services/, but the switchover rule is that no
// current URL changes: every one of these is live at its flat path today and stays there.
//
// Kept as one list so the public route, the admin route and the seed cannot drift apart, and so
// an unknown slug is a cheap 404 rather than a database round trip.
export const SERVICE_PAGE_SLUGS = [
  'care-audits',
  'cqc-compliance',
  'cqc-report-chat',
  'cqc-staff-questions',
  'hr-policies',
  'policy-gap-detection',
  'business-continuity',
] as const

export type ServicePageSlug = (typeof SERVICE_PAGE_SLUGS)[number]

export const isServicePageSlug = (s: string): s is ServicePageSlug =>
  (SERVICE_PAGE_SLUGS as readonly string[]).includes(s)
