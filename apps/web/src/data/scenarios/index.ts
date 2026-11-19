import type { Scenario } from '@/lib/scenarios'
import s01 from './face-to-face-training-follow-up.json'
import s02 from './safeguarding-training-follow-up.json'
import s03 from './moving-and-handling-theory-check.json'
import s04 from './medication-training-understanding-check.json'
import s05 from './infection-control-after-outbreak.json'
import s06 from './fire-safety-drill-debrief.json'
import s07 from './dementia-awareness-workshop-follow-up.json'
import s08 from './mental-capacity-act-dols-workshop.json'
import s09 from './policy-change-staff-briefing.json'
import s10 from './visiting-trainer-follow-up-questions.json'
import s11 from './missed-training-session-catch-up.json'
import s12 from './night-staff-training.json'
import s13 from './everyone-passed-training-assessment.json'
import s14 from './shadow-day-knowledge-check.json'

// One import per page, sorted by `order`. status 'published' pages are public; 'draft' pages are admin preview only.
export const ALL_SCENARIOS = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14] as unknown as Scenario[]

export const publishedScenarios = () =>
  ALL_SCENARIOS.filter(s => s.status === 'published').sort((a, b) => a.order - b.order)

export const getPublishedScenario = (slug: string) => publishedScenarios().find(s => s.slug === slug) ?? null
export const getAnyScenario = (slug: string) => ALL_SCENARIOS.find(s => s.slug === slug) ?? null
