// How the admin search turns what was typed into database filters. Pure, so it can be tested.
// Every word must appear in the name (so "infection control" finds "Infection Control Audit"), words are cut back to a stem
// ("audits" matches "audit", "policies" matches "policy"), and a search that is only a kind of thing ("audits", "training",
// "policies", "onboarding") lists that kind instead of matching names, so it never comes back empty.
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'my', 'our', 'how', 'do', 'i', 'new'])

export const stemWord = (w: string): string =>
  w.length <= 3 ? w : w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.endsWith('ing') && w.length > 5 ? w.slice(0, -3) : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w

export function termsOf(q: string): string[] {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(stemWord)
}

export type Kind = 'audit' | 'training' | 'policy' | 'onboarding'
const KIND_WORDS: Record<Kind, string[]> = {
  audit: ['audit', 'checklist'],
  training: ['train', 'training', 'course', 'cpd', 'module', 'learn', 'elearning'],
  policy: ['policy', 'procedure'],
  onboarding: ['onboard', 'onboarding', 'induction'],
}

/** The kind a search is asking for, when it is only that and nothing more specific. */
export function kindOnly(q: string): Kind | null {
  const raw = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w))
  if (raw.length === 0 || raw.length > 2) return null
  const stems = raw.map(stemWord)
  for (const k of Object.keys(KIND_WORDS) as Kind[]) {
    if (stems.every(s => KIND_WORDS[k].includes(s) || KIND_WORDS[k].includes(raw[stems.indexOf(s)]))) return k
  }
  return null
}

/** A Prisma filter on a name-like field: every term present, case-insensitive. */
export function nameFilter(field: string, q: string): Record<string, unknown> {
  const t = termsOf(q)
  if (!t.length) return { [field]: { contains: q.trim(), mode: 'insensitive' } }
  return { AND: t.map(w => ({ [field]: { contains: w, mode: 'insensitive' } })) }
}

/** The category a policy is filed under, in words a person would use. Raw keys such as internal_policy are not shown. */
export function policyKindLabel(category: string | null | undefined): string | null {
  if (category === 'staff_handbook') return 'Staff handbook'
  if (category === 'cqc_report') return 'CQC report'
  return null
}
