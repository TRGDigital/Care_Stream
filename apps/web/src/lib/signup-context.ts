// The personalised heading on the free sign up page. The sign up links carry where the visitor came from
// (source=audit-<slug>, source=cpd&course=<slug>, source=policy-<slug>), so the page can say "Run the Complaints
// and Concerns Audit free" instead of a generic heading. Anything else gets the standard heading.

import { AUDIT_SOURCE_NAMES } from '@/lib/audit-source-names'
import { CPD_COURSES } from '@/lib/audit-training'

export interface SignupContext { title: string; sub: string; kind: 'audit' | 'cpd' | 'policy' }

const titleCase = (slug: string) =>
  slug.split('-').filter(Boolean).map(w => (['and', 'of', 'the', 'for', 'in', 'to'].includes(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ')

export function signupContext(source: string, course: string): SignupContext | null {
  if (source.startsWith('audit-')) {
    const name = AUDIT_SOURCE_NAMES[source.slice(6)]
    if (name) return { kind: 'audit', title: `Run the ${name} free`, sub: 'No card needed. You also get 100+ more audits, each with scoring, reports and action plans.' }
  }
  if (source === 'cpd' && course) {
    const c = CPD_COURSES[course]
    if (c) return { kind: 'cpd', title: `Get the ${c.title} course free`, sub: 'No card needed. Free for every member of staff, with a certificate and a training matrix.' }
    return { kind: 'cpd', title: 'Get CPD certified training free', sub: 'No card needed. Free for every member of staff, with a certificate and a training matrix.' }
  }
  if (source.startsWith('policy-')) {
    let raw = source.slice(7)
    for (let i = 0; i < 3; i++) raw = raw.replace(/-(policy|policies|and-procedures?|procedures?)$/, '')
    if (raw.length > 2) return { kind: 'policy', title: `Check your ${titleCase(raw)} policy free`, sub: 'No card needed. We check your policy against the regulations for gaps and out of date wording. Your first 5 policies are free.' }
  }
  return null
}
