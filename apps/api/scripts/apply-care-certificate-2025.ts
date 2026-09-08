// Applies the rebuilt Care Certificate Annual Training content to the tier='cpd'
// copy of the Care Certificate module. The prebuilt tier is untouched, matching
// the tier rule: a module never changes tier, and CPD copies carry the deepened
// content that goes to assessment.
//
// Run from apps/api with a working DATABASE_URL:
//   npx tsx scripts/apply-care-certificate-2025.ts           # dry run
//   npx tsx scripts/apply-care-certificate-2025.ts --apply   # write
//
// Idempotent: safe to run again after content tweaks.

import { PrismaClient } from '@prisma/client'
import { CC_ANNUAL_2025 } from '../src/data/care-certificate-annual-2025'
import { PRACTICAL_CHECKLISTS } from '../src/data/practical-checklists'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  const mods = await (prisma as any).trainingModule.findMany({
    where: { name: { contains: 'Care Certificate', mode: 'insensitive' }, tier: 'cpd' },
    select: { id: true, name: true, tier: true, duration_minutes: true, questions: true, learning_content: true },
  })
  if (!mods.length) {
    console.error('No tier=cpd Care Certificate module found. Nothing to do.')
    process.exit(1)
  }
  if (mods.length > 1) {
    console.error(`Found ${mods.length} cpd Care Certificate modules — refusing to guess:`)
    for (const m of mods) console.error(` - ${m.id} ${m.name}`)
    process.exit(1)
  }
  const m = mods[0]
  const c = CC_ANNUAL_2025
  console.log(`Target module: ${m.id}`)
  console.log(`  name:      ${m.name}  ->  ${c.name}`)
  console.log(`  duration:  ${m.duration_minutes} min  ->  ${c.duration_minutes} min`)
  console.log(`  questions: ${Array.isArray(m.questions) ? m.questions.length : 0}  ->  ${c.questions.length}`)
  console.log(`  sections:  ${Array.isArray((m.learning_content as any)?.sections) ? (m.learning_content as any).sections.length : 0}  ->  ${c.sections.length}`)

  // Anything the module carries that this file is not the source of — section
  // image_key above all — survives. An earlier version of this script replaced
  // learning_content wholesale and silently wiped every section image and the
  // observed competency checklist along with it.
  const prev     = (m.learning_content ?? {}) as any
  const prevSecs = Array.isArray(prev.sections) ? prev.sections : []

  const learning_content = {
    ...prev,
    summary: c.summary,
    outcomes: c.outcomes,
    entry_requirements: c.entry_requirements,
    timings: c.timings,
    baseline: c.baseline,
    references: c.references,
    activities: c.activities,
    practical_checklist: PRACTICAL_CHECKLISTS['Care Certificate'] ?? prev.practical_checklist ?? [],
    sections: c.sections.map((s, i) => ({
      // Keep the existing section's own fields (image_key) and overwrite the
      // teaching content this file owns.
      ...(prevSecs[i] ?? {}),
      heading: s.heading,
      minutes: s.minutes,
      body: s.body,
      scenario: s.scenario,
      check: { question: s.check.question, options: s.check.options, correct: s.check.correct },
    })),
  }

  const keptImages = learning_content.sections.filter((s: any) => s?.image_key).length
  console.log(`  images:    ${keptImages}/${learning_content.sections.length} section images carried over`)
  console.log(`  activities: ${Array.isArray(prev.activities) ? prev.activities.length : 0}  ->  ${c.activities.length}`)

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.')
    return
  }
  await (prisma as any).trainingModule.update({
    where: { id: m.id },
    data: {
      name: c.name,
      description: c.description,
      duration_minutes: c.duration_minutes,
      pass_mark: c.pass_mark,
      questions: c.questions,
      questions_version: { increment: 1 },
      learning_content,
    },
  })
  console.log('\nApplied. The hub, certificate and public pages now read the 2025 content.')
}

main().finally(() => prisma.$disconnect())
