// The /uses/* user case pages, one per branch of the home page hub diagram.
// Blog posts are allocated to a user case so each page can render its own
// "Read next" block. A user case shows three posts, so three is the cap.
//
// This list is the single source of truth: the platform console reads it from
// GET /admin/blog/use-cases (with live allocation counts) rather than keeping
// its own copy, so adding a user case here is enough to surface it everywhere.

export const USE_CASE_POST_LIMIT = 3

export interface UseCase {
  slug:  string
  label: string
}

export const USE_CASES: UseCase[] = [
  { slug: 'multilingual-staff-hub',  label: 'Staff Hub in 60+ languages' },
  { slug: 'policy-gaps',             label: 'Policy Gaps' },
  { slug: 'policy-inconsistencies',  label: 'Policy Inconsistencies' },
  { slug: 'cqc-wording-alignment',   label: 'CQC Wording Alignment' },
  { slug: 'out-of-date-policies',    label: 'Policies Out of Date' },
  { slug: 'staff-compliance',        label: 'Staff Compliance' },
  { slug: 'annual-training',         label: 'Annual Training' },
  { slug: 'adhoc-training',          label: 'Adhoc Training' },
  { slug: 'face-to-face-training',   label: 'Face to Face Training' },
  { slug: 'training-matrix',         label: 'Training Matrix' },
  { slug: 'training-calendar',       label: 'Training Calendar' },
  { slug: 'cqc-prep-questions',      label: 'CQC Prep Questions' },
  { slug: 'staff-onboarding',        label: 'Staff Onboarding' },
]

const BY_SLUG = new Map(USE_CASES.map(u => [u.slug, u]))

export const isUseCaseSlug = (slug: string): boolean => BY_SLUG.has(slug)
export const useCaseLabel  = (slug: string): string  => BY_SLUG.get(slug)?.label ?? slug

/** Normalise whatever the client sent into a clean, deduped list of known slugs. */
export function parseUseCaseSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  for (const raw of input) {
    const slug = typeof raw === 'string' ? raw.trim() : ''
    if (slug && isUseCaseSlug(slug)) seen.add(slug)
  }
  return [...seen]
}
