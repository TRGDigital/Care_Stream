// Publish gate for a programme (diploma / pathway), mirroring moduleQa for single
// modules. Hard checks ('fail') block approval; soft checks ('warn') advise.
//
// The bar is deliberately set against what the word "diploma" implies to a buyer:
// real breadth (several units), real volume (hours, not minutes), a cross-module
// synoptic assessment, and every unit itself published and attested.

export type QaCheck = { key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }

const MIN_UNITS      = 4
const MIN_MINUTES    = 300   // 5 hours — Alison's own diploma floor is 8-10h; a pathway can be shorter
const MIN_SYNOPTIC   = 10

function wellFormedMcq(q: any): boolean {
  const opts = Array.isArray(q?.options) ? q.options : []
  return !!String(q?.text ?? '').trim()
    && opts.length === 4
    && opts.every((o: any) => !!String(o ?? '').trim())
    && Number.isInteger(q?.correct) && q.correct >= 0 && q.correct < 4
}

export function runProgrammeQa(programme: any, unitModules: any[]): { checks: QaCheck[]; hard_fails: number; warnings: number; ok_to_approve: boolean } {
  const checks: QaCheck[] = []
  const add = (key: string, label: string, status: QaCheck['status'], detail: string) => checks.push({ key, label, status, detail })

  const isDiploma  = programme?.kind === 'diploma'
  const required   = unitModules.filter((_m, i) => !(programme.units ?? [])[i]?.is_optional)
  const synoptic   = Array.isArray(programme?.synoptic_questions) ? programme.synoptic_questions : []
  const outcomes   = Array.isArray(programme?.outcomes) ? programme.outcomes : []
  const standards  = Array.isArray(programme?.standards) ? programme.standards : []
  const minutes    = unitModules.reduce((n, m) => n + (m?.duration_minutes ?? 0), 0)

  // ── Hard checks ──
  add('units', 'Enough units for a programme', unitModules.length >= MIN_UNITS ? 'pass' : 'fail',
    unitModules.length >= MIN_UNITS ? `${unitModules.length} units.` : `Needs at least ${MIN_UNITS} units (has ${unitModules.length}).`)

  const unpublished = unitModules.filter(m => !m?.approved)
  add('units_published', 'Every unit is published', unpublished.length === 0 ? 'pass' : 'fail',
    unpublished.length === 0 ? 'All units are published standard modules.' : `${unpublished.length} unit(s) are still drafts: ${unpublished.map(m => m?.name).filter(Boolean).join(', ')}.`)

  add('outcomes', 'Programme learning outcomes', outcomes.length >= 4 ? 'pass' : 'fail',
    outcomes.length >= 4 ? `${outcomes.length} programme-level outcomes.` : `Needs at least 4 (has ${outcomes.length}).`)

  // A diploma without a cross-module assessment is just a bundle of certificates.
  if (isDiploma) {
    const badSyn = synoptic.filter((q: any) => !wellFormedMcq(q))
    add('synoptic', 'Synoptic (cross-module) assessment', synoptic.length >= MIN_SYNOPTIC && badSyn.length === 0 ? 'pass' : 'fail',
      synoptic.length < MIN_SYNOPTIC
        ? `A diploma needs a final assessment of at least ${MIN_SYNOPTIC} questions (has ${synoptic.length}).`
        : badSyn.length ? `${badSyn.length} synoptic question(s) malformed (need a stem, 4 options, one correct).`
        : `${synoptic.length} valid synoptic questions.`)

    add('volume', 'Enough taught volume', minutes >= MIN_MINUTES ? 'pass' : 'fail',
      minutes >= MIN_MINUTES ? `${minutes} min ≈ ${(minutes / 60).toFixed(1)} CPD hours across the units.`
        : `A diploma needs at least ${(MIN_MINUTES / 60).toFixed(0)} hours of taught content (has ${(minutes / 60).toFixed(1)}).`)
  } else {
    add('synoptic', 'Synoptic assessment', synoptic.length === 0 || synoptic.every((q: any) => wellFormedMcq(q)) ? 'pass' : 'fail',
      synoptic.length === 0 ? 'None set (optional for a pathway).' : `${synoptic.length} valid synoptic questions.`)
  }

  // ── Soft checks ──
  const unattested = unitModules.filter(m => !m?.attested_by_name)
  add('attestation', 'Units carry a named attestation', unattested.length === 0 ? 'pass' : 'warn',
    unattested.length === 0 ? 'Every unit was attested by a named competent person.' : `${unattested.length} unit(s) have no named reviewer attestation.`)

  add('standards', 'Mapped to external standards', standards.length >= 1 ? 'pass' : 'warn',
    standards.length >= 1 ? `${standards.length} standard(s) mapped at programme level.` : 'Map the programme to at least one Care Certificate / CQC / legislation standard.')

  const noCpd = unitModules.filter(m => !m?.cpd_accredited)
  add('cpd', 'CPD status consistent', !programme?.cpd_accredited || noCpd.length === 0 ? 'pass' : 'warn',
    !programme?.cpd_accredited ? 'Programme is not marked CPD accredited.'
      : noCpd.length === 0 ? 'Every unit is CPD accredited.'
      : `Programme is marked CPD accredited but ${noCpd.length} unit(s) are not — the certificate would overstate it.`)

  const practicalUnits = unitModules.filter(m => m?.requires_practical).length
  add('practical', 'Practical requirement set', !practicalUnits || programme?.require_practical ? 'pass' : 'warn',
    !practicalUnits ? 'No unit needs an observed assessment.'
      : programme?.require_practical ? `${practicalUnits} unit(s) need an observed sign-off, and the programme requires it.`
      : `${practicalUnits} unit(s) need an observed assessment — turn on "require practical sign-off" so the diploma means competence, not just knowledge.`)

  add('reflection', 'Reflective account required', programme?.require_reflection ? 'pass' : 'warn',
    programme?.require_reflection ? 'A reflective account is required to complete.' : 'Consider requiring a reflective account — it is what lifts this above a quiz bundle.')

  const hard_fails = checks.filter(c => c.status === 'fail').length
  const warnings   = checks.filter(c => c.status === 'warn').length
  return { checks, hard_fails, warnings, ok_to_approve: hard_fails === 0 }
}
