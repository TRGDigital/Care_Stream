// CareStream prospecting engine — scoring, segmentation, lead-angle selection,
// why-now and draft-message generation. Pure functions, no I/O.
//
// The thesis: a UK care provider's CQC rating is a buying signal. We split the
// whole regulated universe (snapshotted from CareAssura) into four tiers plus
// "unrated", each with its own pitch and nurture cadence:
//
//   rescue   — Inadequate / Requires Improvement → "fix it + pass re-inspection"
//   protect  — Good overall but a key-question already slipping → "one slip from a downgrade"
//   maintain — clean Good → "stay inspection-ready between visits"
//   defend   — Outstanding → "protect your status"
//   unrated  — not yet rated → "inspection-ready from day one"

export type Segment = 'rescue' | 'protect' | 'maintain' | 'defend' | 'unrated'

export interface ProviderInput {
  cqc_rating: string | null
  cqc_safe_rating: string | null
  cqc_effective_rating: string | null
  cqc_caring_rating: string | null
  cqc_responsive_rating: string | null
  cqc_well_led_rating: string | null
  cqc_inspection_date: string | null // ISO yyyy-mm-dd
  setting: string | null
  name: string
  phone: string | null
  email: string | null
  website: string | null
}

export interface Scored {
  segment: Segment
  score: number
  angleKey: string
  angleLabel: string
  failingDomains: string[]
  whyNow: string
}

// Failing CQC key-questions, ordered by how strong a CareStream wedge each is.
// When several fail we open with the highest one here.
const DOMAIN_ANGLES = [
  { key: 'well_led', label: 'Well-led', capability: 'AI compliance & audit workspace', hook: 'governance, audit trails and a credible CQC action plan' },
  { key: 'safe', label: 'Safe', capability: 'AI policy library (safeguarding & medicines)', hook: 'up-to-date safeguarding and medicines policies your staff can actually find and follow' },
  { key: 'effective', label: 'Effective', capability: 'AI staff training & competency modules', hook: 'evidenced staff training and competency records' },
  { key: 'responsive', label: 'Responsive', capability: 'Person-centred care-planning policies', hook: 'person-centred care-planning that stands up to inspection' },
  { key: 'caring', label: 'Caring', capability: 'Dignity & respect policy pack', hook: 'dignity, consent and respect embedded in day-to-day practice' },
] as const

const RATING_LABEL: Record<string, string> = {
  inadequate: 'Inadequate',
  requires_improvement: 'Requires Improvement',
  good: 'Good',
  outstanding: 'Outstanding',
  not_rated: 'Not yet rated',
}

const isFail = (v: string | null) => v === 'inadequate' || v === 'requires_improvement'

export function ratingLabel(rating: string | null): string {
  return (rating && RATING_LABEL[rating]) || 'Not yet rated'
}

export function settingLabel(p: { setting?: string | null }): string {
  return p.setting || 'Care provider'
}

// Days between an ISO date and now (whole days). null if unparseable.
export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.round((now.getTime() - t) / 86_400_000)
}

function failingDomainsOf(p: ProviderInput) {
  return DOMAIN_ANGLES.filter((d) => isFail(p[`cqc_${d.key}_rating` as keyof ProviderInput] as string | null))
}

function contactability(p: ProviderInput): number {
  return (p.phone ? 3 : 0) + (p.email ? 5 : 0) + (p.website ? 2 : 0)
}

// Classify + score a provider. Always returns a result (every provider is a
// lead in some tier); the segment + score decide priority.
export function scoreProvider(p: ProviderInput, now: Date): Scored {
  const rating = p.cqc_rating
  const failing = failingDomainsOf(p)
  const recencyDays = daysSince(p.cqc_inspection_date, now)
  const recent = recencyDays != null && recencyDays <= 90
  const contact = contactability(p)
  const fmtDate = p.cqc_inspection_date ?? null

  // ── rescue ──────────────────────────────────────────────────────────────
  if (rating === 'inadequate' || rating === 'requires_improvement') {
    let score = rating === 'inadequate' ? 100 : 60
    if (failing.some((d) => d.key === 'well_led')) score += 15
    if (failing.some((d) => d.key === 'effective')) score += 15
    if (failing.some((d) => d.key === 'safe')) score += 10
    if (recent) score += 20
    score += contact
    const angle = failing[0] ?? DOMAIN_ANGLES[0]
    const when = recent ? `inspected ${recencyDays} days ago` : fmtDate ? `inspected ${fmtDate}` : 'recently inspected'
    return {
      segment: 'rescue',
      score,
      angleKey: angle.key,
      angleLabel: angle.capability,
      failingDomains: failing.map((d) => d.label),
      whyNow: `Rated ${ratingLabel(rating)} (${when})${failing.length ? `, failing on ${failing.map((d) => d.label).join(', ')}` : ''} — live CQC action-plan window.`,
    }
  }

  // ── protect ── Good overall but ≥1 key-question already slipping ──────────
  if (rating === 'good' && failing.length) {
    let score = 50 + failing.length * 8
    if (failing.some((d) => d.key === 'well_led')) score += 12
    if (recent) score += 15
    score += contact
    const angle = failing[0] ?? DOMAIN_ANGLES[0]
    return {
      segment: 'protect',
      score,
      angleKey: angle.key,
      angleLabel: angle.capability,
      failingDomains: failing.map((d) => d.label),
      whyNow: `Good overall, but ${failing.map((d) => d.label).join(', ')} already at Requires Improvement — one slip from a downgrade at the next inspection.`,
    }
  }

  // ── maintain ── clean Good ────────────────────────────────────────────────
  if (rating === 'good') {
    let score = 25 + (recent ? 10 : 0) + contact
    return {
      segment: 'maintain',
      score,
      angleKey: 'maintain',
      angleLabel: 'Continuous compliance monitoring',
      failingDomains: [],
      whyNow: `Rated Good${fmtDate ? ` (inspected ${fmtDate})` : ''}. Holding the rating between inspections needs ongoing evidence — easy to drift without a system.`,
    }
  }

  // ── defend ── Outstanding ─────────────────────────────────────────────────
  if (rating === 'outstanding') {
    let score = 35 + (recent ? 10 : 0) + contact
    return {
      segment: 'defend',
      score,
      angleKey: 'defend',
      angleLabel: 'Evidence & audit workspace',
      failingDomains: [],
      whyNow: `Rated Outstanding${fmtDate ? ` (inspected ${fmtDate})` : ''} — only ~4% of providers hold this. Protecting it takes continuous, inspection-ready evidence.`,
    }
  }

  // ── unrated ── not yet rated / awaiting first inspection ──────────────────
  return {
    segment: 'unrated',
    score: 30 + contact,
    angleKey: 'unrated',
    angleLabel: 'Policy library & training onboarding',
    failingDomains: [],
    whyNow: `Not yet rated — registering or awaiting a first inspection. The best time to embed policies, training and audits before CQC visits.`,
  }
}

// Draft a personalised outreach email for a scored lead, tailored to its tier.
export function draftMessage(lead: {
  name: string
  segment: Segment
  cqc_rating: string | null
  failingDomains: string[]
  angleLabel: string
  angleKey: string
}): { subject: string; body: string } {
  const name = lead.name
  const angleHook = DOMAIN_ANGLES.find((d) => d.key === lead.angleKey)?.hook
  const failing = lead.failingDomains.join(', ')

  let subject = `${name} — staying inspection-ready with CareStream`
  let opener = ''
  let value = ''

  switch (lead.segment) {
    case 'rescue': {
      subject = `${name} — a faster route to your CQC action plan`
      const reInspect =
        lead.cqc_rating === 'inadequate'
          ? 'CQC typically re-inspects an Inadequate service within ~6 months, and a service can be placed into special measures'
          : 'CQC will re-inspect to check improvements, usually within ~12 months'
      opener = `I saw that ${name} was rated "${ratingLabel(lead.cqc_rating)}" at its latest CQC inspection${failing ? `, with ${failing} flagged` : ''}. ${reInspect}, so the next few months really matter.`
      value = `For your situation it would help most with ${angleHook ?? 'governance, evidence and an action plan'} — our ${lead.angleLabel} turns the inspection findings into an evidenced action plan, keeps your policies current, and lets any staff member ask a question and get the right, referenced answer (in their own language). Providers use it to walk into re-inspection with the paperwork already in order.`
      break
    }
    case 'protect': {
      subject = `${name} — protecting your Good rating before re-inspection`
      opener = `${name} is rated Good overall, but ${failing || 'one of the key questions'} sits at Requires Improvement. That's the area CQC will look at hardest next time, and it's the most common route to a downgrade.`
      value = `Our ${lead.angleLabel} closes exactly that gap — ${angleHook ?? 'the evidence and policies behind that domain'} — so you walk into the next inspection with it already covered, not scrambling.`
      break
    }
    case 'maintain': {
      subject = `${name} — keeping your Good rating between inspections`
      opener = `Congratulations on your Good rating. The hard part is holding it: policies drift, staff turn over, and evidence goes stale between inspections — which is where most downgrades come from.`
      value = `CareStream keeps it all current automatically: a live policy library, evidenced staff training, and continuous audits, with an AI assistant your team can ask anything (in their own language). It's the difference between proving you're still Good and hoping you are.`
      break
    }
    case 'defend': {
      subject = `${name} — protecting your Outstanding rating`
      opener = `Being rated Outstanding puts you in the top few per cent of providers — and makes the next inspection higher-stakes, because the only way is down unless the evidence keeps pace.`
      value = `CareStream gives you a continuously inspection-ready evidence base: current policies, audit trails, and training records on demand, plus an AI assistant for your team. It's built to help Outstanding providers stay Outstanding.`
      break
    }
    case 'unrated': {
      subject = `${name} — getting inspection-ready from day one`
      opener = `As a newer service you've got a real advantage: you can build compliance in from the start rather than retrofit it under inspection pressure.`
      value = `CareStream gives you a ready-made policy library, staff training and audits out of the box, with an AI assistant your team can ask anything (in their own language) — so your first CQC inspection finds a service that already has its house in order.`
      break
    }
  }

  const body = [
    `Hi there,`,
    ``,
    opener,
    ``,
    `CareStream is an AI compliance assistant built specifically for UK care providers. ${value}`,
    ``,
    `It's £49–£129 per location, and I can show you exactly how it maps to your service in a 15-minute call. Would later this week suit?`,
    ``,
    `Best,`,
    `The CareStream team`,
  ].join('\n')

  return { subject, body }
}

export const SEGMENT_META: Record<Segment, { label: string; tagline: string }> = {
  rescue: { label: 'Rescue', tagline: 'Inadequate / Requires Improvement — fix it + pass re-inspection' },
  protect: { label: 'Protect', tagline: 'Good, but a domain slipping — one slip from a downgrade' },
  maintain: { label: 'Maintain', tagline: 'Clean Good — stay inspection-ready between visits' },
  defend: { label: 'Defend', tagline: 'Outstanding — protect your status' },
  unrated: { label: 'Unrated', tagline: 'Not yet rated — inspection-ready from day one' },
}
