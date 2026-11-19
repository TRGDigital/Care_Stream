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
import s15 from './one-carer-keeps-getting-the-same-question-wrong.json'
import s16 from './whole-team-got-the-same-question-wrong.json'
import s17 from './weakest-training-topics-before-an-inspection.json'
import s18 from './monday-training-digest-ten-minutes.json'
import s19 from './knowledge-gaps-in-supervision.json'
import s20 from './near-miss-short-training-module.json'
import s21 from './complaint-follow-up-check-understanding.json'
import s22 from './after-a-safeguarding-concern-check-the-team.json'
import s23 from './staff-who-guess-their-way-through.json'
import s24 from './carer-fails-the-retry-again.json'
import s25 from './proving-a-training-gap-closed.json'
import s26 from './staff-whose-first-language-is-not-english.json'
import s27 from './international-recruits-first-weeks-induction.json'
import s28 from './mixed-language-team-one-carer-translates.json'
import s29 from './staff-suggest-a-better-translation.json'
import s30 from './policy-change-understood-in-every-language.json'
import s31 from './carer-asks-the-assistant-a-question-privately.json'
import s32 from './carer-speaks-english-well-but-reads-slowly.json'

// One import per page, sorted by `order`. status 'published' pages are public; 'draft' pages are admin preview only.
export const ALL_SCENARIOS = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26, s27, s28, s29, s30, s31, s32] as unknown as Scenario[]

export const publishedScenarios = () =>
  ALL_SCENARIOS.filter(s => s.status === 'published').sort((a, b) => a.order - b.order)

export const getPublishedScenario = (slug: string) => publishedScenarios().find(s => s.slug === slug) ?? null
export const getAnyScenario = (slug: string) => ALL_SCENARIOS.find(s => s.slug === slug) ?? null
