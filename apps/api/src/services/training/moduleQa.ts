// Automated pre-approval quality checks for a standard training module. Repeatable,
// auditable "quality assurance by design" that backs the named reviewer attestation
// for CPD. Hard checks (status 'fail') block approval; soft checks ('warn') advise.

export type QaCheck = { key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }
export type QaResult = { checks: QaCheck[]; hard_fails: number; warnings: number; ok_to_approve: boolean }

function wellFormedMcq(q: any): boolean {
  const opts = Array.isArray(q?.options) ? q.options.filter((o: any) => String(o ?? '').trim()) : []
  return !!String(q?.text ?? q?.question ?? '').trim() && opts.length === 4 && Number.isInteger(q?.correct) && q.correct >= 0 && q.correct <= 3
}

// Rough plain-language signal: average words per sentence across the lesson bodies.
// Long sentences translate poorly into carers' first languages, so we flag them.
function avgWordsPerSentence(sections: any[]): number {
  const text = sections.map(s => `${s?.body ?? ''} ${s?.scenario?.situation ?? ''} ${s?.scenario?.answer ?? ''}`).join(' ')
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  if (!sentences.length) return 0
  const words = sentences.reduce((a, s) => a + s.split(/\s+/).filter(Boolean).length, 0)
  return Math.round(words / sentences.length)
}

export function runModuleQa(module: any): QaResult {
  const lc = (module?.learning_content ?? {}) as any
  const outcomes = Array.isArray(lc.outcomes) ? lc.outcomes.filter((o: any) => String(o ?? '').trim()) : []
  const sections = Array.isArray(lc.sections) ? lc.sections : []
  const questions = Array.isArray(module?.questions) ? module.questions : []
  const refs = Array.isArray(module?.policy_refs) ? module.policy_refs : []
  const standards = Array.isArray(module?.standards) ? module.standards : []

  const checks: QaCheck[] = []
  const add = (key: string, label: string, status: QaCheck['status'], detail: string) => checks.push({ key, label, status, detail })

  // Hard checks
  add('outcomes', 'Learning outcomes', outcomes.length >= 3 ? 'pass' : 'fail',
    outcomes.length >= 3 ? `${outcomes.length} measurable outcomes.` : `Needs at least 3 (has ${outcomes.length}).`)

  const badSections = sections.filter((s: any) => !String(s?.body ?? '').trim() || !String(s?.scenario?.situation ?? '').trim() || !wellFormedMcq(s?.check))
  add('sections', 'Interactive sections (with scenario + check)', sections.length >= 3 && badSections.length === 0 ? 'pass' : 'fail',
    sections.length < 3 ? `Needs at least 3 sections (has ${sections.length}).` : badSections.length ? `${badSections.length} section(s) missing a scenario or a valid check.` : `${sections.length} complete sections.`)

  const badQs = questions.filter((q: any) => !wellFormedMcq(q))
  add('questions', 'Assessment questions well-formed', questions.length >= 10 && badQs.length === 0 ? 'pass' : 'fail',
    questions.length < 10 ? `Needs at least 10 questions (has ${questions.length}).` : badQs.length ? `${badQs.length} question(s) malformed (need a stem, 4 options, one correct).` : `${questions.length} valid questions.`)

  // Soft checks
  add('sources', 'Grounded in cited sources', refs.length >= 1 ? 'pass' : 'warn',
    refs.length >= 1 ? `${refs.length} source(s) cited.` : 'No grounding sources recorded — regenerate so it cites the reference policies.')

  add('duration', 'CPD duration set', module?.duration_minutes ? 'pass' : 'warn',
    module?.duration_minutes ? `${module.duration_minutes} min (≈${(module.duration_minutes / 60).toFixed(1)} CPD h).` : 'Set an estimated duration to give it a CPD-hour value.')

  add('standards', 'Mapped to external standards', standards.length >= 1 ? 'pass' : 'warn',
    standards.length >= 1 ? `${standards.length} standard(s) mapped.` : 'Map to at least one Care Certificate / CQC / legislation standard.')

  const awps = avgWordsPerSentence(sections)
  add('readability', 'Plain language (translation-friendly)', awps === 0 || awps <= 22 ? 'pass' : 'warn',
    awps === 0 ? 'No lesson text to check.' : awps <= 22 ? `Avg ${awps} words/sentence — clear.` : `Avg ${awps} words/sentence — shorten for clearer translation into carers' languages.`)

  const hard_fails = checks.filter(c => c.status === 'fail').length
  const warnings = checks.filter(c => c.status === 'warn').length
  return { checks, hard_fails, warnings, ok_to_approve: hard_fails === 0 }
}
