// Shape of a CPD course source file (src/data/cpd-*.ts). One file per course is
// the source of truth for everything the CPD assessor sees: lesson, scenarios,
// activities, checks, baseline, final bank, timings, references and glossary.
// scripts/apply-cpd-course.ts writes it to the tier='cpd' module named by
// module_id, and nothing else.

export type CpdQuestion = { id: string; text: string; options: string[]; correct: number }

export type CpdSection = {
  heading: string
  minutes: number
  body: string
  scenario: { situation: string; prompt: string; answer: string }
  check: { question: string; options: string[]; correct: number; explanation: string }
  // Scene for the section image (fed to the image model instead of the body) and
  // the alt text the players render with it.
  image_prompt: string
  image_alt: string
}

export type CpdActivity =
  | { id: string; type: 'order'; after_section: number; title: string; instructions: string; steps: string[] }
  | { id: string; type: 'sort'; after_section: number; title: string; instructions: string; bins: { id: string; name: string; note: string }[]; items: { text: string; bin: string }[] }
  | { id: string; type: 'match'; after_section: number; title: string; instructions: string; pairs: { term: string; definition: string }[] }

export type CpdCourse = {
  module_id: string
  name: string
  duration_minutes: number
  pass_mark: number
  frequency: 'annual' | 'biennial' | 'triennial'
  renewal_months: number
  requires_practical: boolean
  description: string
  entry_requirements: string
  summary: string
  outcomes: string[]
  key_points: string[]
  timings: { part: string; minutes: number }[]
  baseline: CpdQuestion[]
  sections: CpdSection[]
  activities: CpdActivity[]
  references: { title: string; url: string; source: string; note: string }[]
  glossary: { term: string; definition: string }[]
  practical_checklist: string[]
  questions: CpdQuestion[]
}
