// The personalised heading on the free sign up page. The sign up links carry where the visitor came from
// (source=audit-<slug>, source=cpd&course=<slug>, source=policy-<slug>), so the page can say "Run the Complaints
// and Concerns Audit free" instead of a generic heading. Anything else gets the standard heading.

import { AUDIT_SOURCE_NAMES } from '@/lib/audit-source-names'
import { CPD_COURSES } from '@/lib/audit-training'

export interface SignupContext { title: string; sub: string; kind: 'audit' | 'cpd' | 'policy' | 'blog' }

const titleCase = (slug: string) =>
  slug.split('-').filter(Boolean).map(w => (['and', 'of', 'the', 'for', 'in', 'to'].includes(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ')

const BLOG_TOPICS: Record<string, { title: string; line: string }> = {
  audits:  { title: 'Run your first audit free', line: 'every one of our 100+ audit templates is free to run, with scoring, reports and action plans' },
  cpd:     { title: 'Train your whole team free', line: 'CPD certified training is free for every member of staff, with certificates and a training matrix' },
  policy:  { title: 'Check your first 5 policies free', line: 'we check your policies against the regulations for gaps and out of date wording' },
}

export function signupContext(source: string, course: string, blog?: { topic?: string; blogTitle?: string | null }): SignupContext | null {
  if (source.startsWith('blog-') && blog?.topic && BLOG_TOPICS[blog.topic]) {
    const t = BLOG_TOPICS[blog.topic]
    const post = blog.blogTitle ? (blog.blogTitle.length > 80 ? blog.blogTitle.slice(0, 77).trimEnd() + '...' : blog.blogTitle) : ''
    return { kind: 'blog', title: t.title, sub: post ? `Put \u201c${post}\u201d into practice. No card needed, and ${t.line}.` : `No card needed, and ${t.line}.` }
  }
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
