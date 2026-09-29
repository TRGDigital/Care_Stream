// Applies a CPD course source file (src/data/cpd-*.ts) to its tier='cpd' module.
//
// Run from apps/api with a working DATABASE_URL:
//   npx tsx scripts/apply-cpd-course.ts food-hygiene            # validate + dry run
//   npx tsx scripts/apply-cpd-course.ts food-hygiene --apply    # write
//   npx tsx scripts/apply-cpd-course.ts food-hygiene --sql      # write the same merge as SQL
//
// The module is found by id and must be tier='cpd': a lookup by topic or name
// once overwrote the wrong tier, so neither is used. The file is validated
// against the CPD playbook before anything is written, and the write MERGES:
// fields the file does not own survive, and a section keeps its image only
// while its heading is unchanged (a re-planned section needs a new image).
// learning_content has no version history, so the previous value is printed to
// a backup file first.

import { writeFileSync, mkdirSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import type { CpdCourse } from '../src/data/cpd-course-types'
import { CPD_FOOD_HYGIENE } from '../src/data/cpd-food-hygiene'
import { CPD_IPC } from '../src/data/cpd-ipc'
import { CPD_MENTAL_HEALTH } from '../src/data/cpd-mental-health'
import { CPD_HEALTH_SAFETY } from '../src/data/cpd-health-safety'
import { CPD_COSHH } from '../src/data/cpd-coshh'
import { CPD_END_OF_LIFE } from '../src/data/cpd-end-of-life'
import { CPD_GDPR } from '../src/data/cpd-gdpr'
import { CPD_MOVING_HANDLING } from '../src/data/cpd-moving-handling'

const COURSES: Record<string, CpdCourse> = {
  'food-hygiene': CPD_FOOD_HYGIENE,
  'ipc': CPD_IPC,
  'mental-health': CPD_MENTAL_HEALTH,
  'health-safety': CPD_HEALTH_SAFETY,
  'coshh': CPD_COSHH,
  'end-of-life': CPD_END_OF_LIFE,
  'gdpr': CPD_GDPR,
  'moving-handling': CPD_MOVING_HANDLING,
}

const prisma = new PrismaClient()
const APPLY  = process.argv.includes('--apply')
const SQL    = process.argv.includes('--sql')

// The same merge as --apply, as one SQL statement, for when only a SQL console is
// available. Snapshots the row into cpd_content_backups first, and keeps a
// section's image_key only where the section heading is unchanged.
export function toSql(c: CpdCourse): string {
  const q = (v: unknown) => `$cpd$${JSON.stringify(v)}$cpd$::jsonb`
  const t = (v: string) => `'${v.replace(/'/g, "''")}'`
  const sections = c.sections.map(s => ({
    heading: s.heading, minutes: s.minutes, body: s.body, scenario: s.scenario, check: s.check,
    image_prompt: s.image_prompt, image_alt: s.image_alt,
  }))
  const lc = {
    summary: c.summary, outcomes: c.outcomes, key_points: c.key_points, entry_requirements: c.entry_requirements,
    timings: c.timings, baseline: c.baseline, activities: c.activities,
    references: c.references, glossary: c.glossary, practical_checklist: c.practical_checklist,
  }
  return `insert into cpd_content_backups (module_id, reason, row_snapshot)
  select id, ${t(`before apply-cpd-course: ${c.name}`)}, to_jsonb(m) from training_modules m where id = ${t(c.module_id)} and tier = 'cpd';
update training_modules m set
  name = ${t(c.name)}, description = ${t(c.description)}, duration_minutes = ${c.duration_minutes}, pass_mark = ${c.pass_mark},
  frequency = ${t(c.frequency)}, renewal_months = ${c.renewal_months}, requires_practical = ${c.requires_practical},
  questions = ${q(c.questions)}, questions_version = m.questions_version + 1,
  learning_content = (coalesce(m.learning_content, '{}'::jsonb) || ${q(lc)}) || jsonb_build_object('sections', (
    select jsonb_agg(case when o.value ->> 'heading' = n.value ->> 'heading' and o.value ? 'image_key'
                          then n.value || jsonb_build_object('image_key', o.value -> 'image_key') else n.value end order by n.ord)
    from jsonb_array_elements(${q(sections)}) with ordinality n(value, ord)
    left join jsonb_array_elements(coalesce(m.learning_content -> 'sections', '[]'::jsonb)) with ordinality o(value, ord) using (ord)))
where m.id = ${t(c.module_id)} and m.tier = 'cpd'
returning m.id, m.name, m.duration_minutes, jsonb_array_length(m.questions) as questions, jsonb_array_length(m.learning_content -> 'sections') as sections;
`
}

function words(s: string): number { return s.trim().split(/\s+/).filter(Boolean).length }

export function validate(c: CpdCourse): string[] {
  const errs: string[] = []
  const timed = c.timings.reduce((n, t) => n + t.minutes, 0)
  if (timed !== c.duration_minutes) errs.push(`timings total ${timed} min but duration_minutes is ${c.duration_minutes}`)
  const secRows = c.timings.filter(t => /^Section \d+\./.test(t.part))
  if (secRows.length !== c.sections.length) errs.push(`${secRows.length} section rows in timings for ${c.sections.length} sections`)
  c.sections.forEach((s, i) => {
    if (secRows[i] && secRows[i].minutes !== s.minutes) errs.push(`section ${i + 1} is ${s.minutes} min but its timings row says ${secRows[i].minutes}`)
    if (!s.scenario?.situation || !s.scenario?.answer) errs.push(`section ${i + 1} has no scenario`)
    if (!s.check?.explanation) errs.push(`section ${i + 1} check has no explanation`)
    if (!s.image_prompt || !s.image_alt) errs.push(`section ${i + 1} has no image prompt or alt text`)
    if (words(s.body) < 200) errs.push(`section ${i + 1} lesson is only ${words(s.body)} words`)
  })
  const covered = new Set(c.activities.map(a => a.after_section))
  c.sections.forEach((_, i) => { if (!covered.has(i)) errs.push(`section ${i + 1} has no activity`) })
  for (const a of c.activities) {
    if (a.after_section < 0 || a.after_section >= c.sections.length) errs.push(`${a.id} after_section ${a.after_section} out of range`)
    if (a.type === 'sort') {
      const bins = new Set(a.bins.map(b => b.id))
      a.items.forEach(it => { if (!bins.has(it.bin)) errs.push(`${a.id} item "${it.text}" uses unknown bin ${it.bin}`) })
    }
  }
  const qs = [...c.baseline, ...c.questions, ...c.sections.map((s, i) => ({ id: `check${i + 1}`, ...s.check, text: s.check.question }))]
  for (const q of qs) {
    if (q.options.length !== 4) errs.push(`${q.id} has ${q.options.length} options, not 4`)
    if (q.correct < 0 || q.correct >= q.options.length) errs.push(`${q.id} correct index out of range`)
  }
  const ids = [...c.baseline, ...c.questions].map(q => q.id)
  if (new Set(ids).size !== ids.length) errs.push('duplicate question ids')
  if (c.baseline.length < 4 || c.baseline.length > 5) errs.push(`${c.baseline.length} baseline questions, playbook says 4 or 5`)
  if (c.questions.length < c.sections.length * 2) errs.push(`${c.questions.length} final questions for ${c.sections.length} sections, playbook says about 2 per section`)
  if (c.references.length < 8 || c.references.length > 10) errs.push(`${c.references.length} references, playbook says 8 to 10`)
  c.references.forEach(r => { if (!r.note || !/^https:\/\//.test(r.url)) errs.push(`reference "${r.title}" needs an https url and a note`) })
  if (words(c.description) > 100) errs.push(`description is ${words(c.description)} words, CPD SMART allows 100`)
  if (c.requires_practical && c.practical_checklist.length === 0) errs.push('requires_practical but no checklist')
  if (!c.requires_practical && c.practical_checklist.length > 0) errs.push('checklist present but requires_practical is false; the pack would claim an observation')
  const all = JSON.stringify(c)
  if (/[–—]/.test(all)) errs.push('contains an en or em dash')
  if (/competen/i.test(c.outcomes.join(' ') + c.description + c.summary)) errs.push('outcomes, description or summary claim competence')
  return errs
}

async function main() {
  const key = process.argv.slice(2).find(a => !a.startsWith('--'))
  const c = key ? COURSES[key] : undefined
  if (!c) {
    console.error(`Usage: npx tsx scripts/apply-cpd-course.ts <${Object.keys(COURSES).join('|')}> [--apply]`)
    process.exit(1)
  }

  const errs = validate(c)
  if (errs.length) {
    console.error(`${c.name}: ${errs.length} problem(s), nothing written:`)
    errs.forEach(e => console.error(` - ${e}`))
    process.exit(1)
  }
  console.log(`${c.name}: passes the playbook checks.`)
  if (SQL) {
    mkdirSync('backups', { recursive: true })
    const file = `backups/apply-${key}.sql`
    writeFileSync(file, toSql(c))
    console.log(`SQL written to ${file}`)
    return
  }

  const m = await (prisma as any).trainingModule.findUnique({ where: { id: c.module_id } })
  if (!m) { console.error(`Module ${c.module_id} not found.`); process.exit(1) }
  if (m.tier !== 'cpd') { console.error(`Module ${c.module_id} is tier=${m.tier}, not cpd. Refusing.`); process.exit(1) }

  const prev     = (m.learning_content ?? {}) as any
  const prevSecs = Array.isArray(prev.sections) ? prev.sections : []
  const sections = c.sections.map((s, i) => {
    const old = prevSecs[i]
    const keepImage = old?.image_key && old.heading === s.heading
    return {
      ...(keepImage ? { image_key: old.image_key } : {}),
      heading: s.heading, minutes: s.minutes, body: s.body, scenario: s.scenario, check: s.check,
      image_prompt: s.image_prompt, image_alt: s.image_alt,
    }
  })
  const learning_content = {
    ...prev,
    summary: c.summary, outcomes: c.outcomes, key_points: c.key_points, entry_requirements: c.entry_requirements,
    timings: c.timings, baseline: c.baseline, sections, activities: c.activities,
    references: c.references, glossary: c.glossary, practical_checklist: c.practical_checklist,
  }

  console.log(`Target: ${m.id} (tier ${m.tier})`)
  console.log(`  name       ${m.name} -> ${c.name}`)
  console.log(`  duration   ${m.duration_minutes} -> ${c.duration_minutes} min`)
  console.log(`  frequency  ${m.frequency}/${m.renewal_months} -> ${c.frequency}/${c.renewal_months}`)
  console.log(`  questions  ${Array.isArray(m.questions) ? m.questions.length : 0} -> ${c.questions.length}`)
  console.log(`  sections   ${prevSecs.length} -> ${sections.length}, images kept ${sections.filter((s: any) => s.image_key).length}`)
  console.log(`  activities ${Array.isArray(prev.activities) ? prev.activities.length : 0} -> ${c.activities.length}`)
  console.log(`  checklist  ${Array.isArray(prev.practical_checklist) ? prev.practical_checklist.length : 0} -> ${c.practical_checklist.length}`)

  if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); return }

  mkdirSync('backups', { recursive: true })
  const file = `backups/${m.id}-${new Date().toISOString().replace(/[:.]/g, '')}.json`
  writeFileSync(file, JSON.stringify({ name: m.name, description: m.description, duration_minutes: m.duration_minutes, questions: m.questions, learning_content: m.learning_content }, null, 2))
  console.log(`Backup written to ${file}`)

  await (prisma as any).trainingModule.update({
    where: { id: m.id },
    data: {
      name: c.name, description: c.description, duration_minutes: c.duration_minutes, pass_mark: c.pass_mark,
      frequency: c.frequency, renewal_months: c.renewal_months, requires_practical: c.requires_practical,
      questions: c.questions, questions_version: { increment: 1 }, learning_content,
    },
  })
  console.log('Applied.')
}

if (require.main === module) main().finally(() => prisma.$disconnect())
