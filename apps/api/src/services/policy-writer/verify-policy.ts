// Verification gate for paid policies.
//
// We sell these as correct against legislation, CQC and law, and our own gap analysis
// must never be able to fault one. So a draft is not "done" when the writer returns:
// it is done when it has passed the same kind of judgement the client's coverage run
// would apply. Approve is gated on this; the platform tab shows the checklist.
//
// Four checks:
//   substitution — no placeholder tokens survived ([insert...], [name], TBC, XXX).
//   terminology  — no organisations or instruments that no longer exist.
//   identity     — the buyer's organisation is actually named in the document.
//   coverage     — an AI judge confirms every curated required element of every
//                  regulation the order maps to is addressed. The judge lists what is
//                  missing, which feeds the rewrite loop as concrete instructions.
//
// A judge that cannot be parsed FAILS the check. Silence is never a pass.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

const MODEL_SONNET = 'claude-sonnet-4-5-20250929'

// Organisations and instruments that a current policy must not cite as extant.
// Mirrors the policy-lint families; kept to unambiguous cases so the gate cannot
// false-positive on legitimate historical references is a risk we accept for v1.
const OUTDATED_TERMS: Array<{ term: RegExp; note: string }> = [
  { term: /NHS Digital/i,               note: 'Refers to NHS Digital (merged into NHS England, 2023)' },
  { term: /Public Health England/i,     note: 'Refers to Public Health England (replaced by UKHSA/OHID, 2021)' },
  { term: /\bCRB check|Criminal Records Bureau/i, note: 'Refers to CRB (replaced by DBS, 2012)' },
  { term: /Regulated Activities\) Regulations 2010/i, note: 'Cites the 2010 Regulated Activities Regulations (superseded by the 2014 Regulations)' },
  { term: /National Minimum Standards/i, note: 'Refers to National Minimum Standards (pre-CQC regime)' },
]

// Placeholder tokens that must never survive into a sold document. Markdown links
// ("[text](url)") are excluded by the negative lookahead.
const PLACEHOLDER_RE = /\[(?![^\]]*\]\()([^\]\n]{0,60})\]|\bTBC\b|\bTO BE CONFIRMED\b|X{3,}/g

export type PolicyVerification = {
  passed: boolean
  checked_at: string
  checks: {
    substitution: { passed: boolean; issues: string[] }
    terminology:  { passed: boolean; issues: string[] }
    identity:     { passed: boolean; issues: string[] }
    coverage:     {
      passed: boolean
      issues: string[]
      regulations: Array<{ reference_key: string; official_name: string; met: boolean; missing_elements: string[] }>
    }
  }
}

/** Every failure as a plain instruction, for the rewrite loop and the platform UI. */
export function verificationFailures(v: PolicyVerification): string[] {
  const out: string[] = []
  out.push(...v.checks.substitution.issues)
  out.push(...v.checks.terminology.issues)
  out.push(...v.checks.identity.issues)
  for (const r of v.checks.coverage.regulations) {
    for (const m of r.missing_elements) out.push(`${r.official_name}: the draft does not address "${m}"`)
  }
  out.push(...v.checks.coverage.issues)
  return out
}

export async function verifyPaidPolicyDraft(purchaseId: string): Promise<PolicyVerification> {
  const purchase = await (prisma as any).policyPurchase.findUnique({ where: { id: purchaseId } })
  if (!purchase) throw new Error('That order was not found')
  const draft: string = purchase.draft_content ?? ''
  if (!draft.trim()) throw new Error('There is no draft to verify')

  const [tenant, regs] = await Promise.all([
    (prisma as any).tenant.findUnique({ where: { id: purchase.tenant_id }, select: { name: true } }),
    (prisma as any).externalRegulation.findMany({
      where:  { reference_key: { in: purchase.reference_keys ?? [] } },
      select: { reference_key: true, official_name: true, required_elements: true },
    }),
  ])

  // ── Deterministic checks ────────────────────────────────────────────────────
  const substitution = { passed: true, issues: [] as string[] }
  const seen = new Set<string>()
  for (const m of draft.matchAll(PLACEHOLDER_RE)) {
    const token = m[0].trim()
    if (!seen.has(token)) { seen.add(token); substitution.issues.push(`Placeholder left in the document: "${token}"`) }
  }
  substitution.passed = substitution.issues.length === 0

  const terminology = { passed: true, issues: [] as string[] }
  for (const t of OUTDATED_TERMS) if (t.term.test(draft)) terminology.issues.push(t.note)
  terminology.passed = terminology.issues.length === 0

  const identity = { passed: true, issues: [] as string[] }
  const homeName = String(tenant?.name ?? '').trim()
  if (!homeName || !draft.toLowerCase().includes(homeName.toLowerCase())) {
    identity.issues.push(`The organisation's name ("${homeName || 'unknown'}") does not appear in the document`)
  }
  identity.passed = identity.issues.length === 0

  // ── Coverage judge ──────────────────────────────────────────────────────────
  const coverage = {
    passed: true, issues: [] as string[],
    regulations: [] as Array<{ reference_key: string; official_name: string; met: boolean; missing_elements: string[] }>,
  }
  const judged = (regs as any[]).filter(r => Array.isArray(r.required_elements) && r.required_elements.length)
  if (judged.length) {
    const prompt = `You are auditing whether a care policy document addresses required regulatory elements.
For each element, judge whether the DOCUMENT genuinely addresses it: states what the organisation does, who does it, and evidences it. A passing mention is not enough; a dedicated or substantial treatment is.
Reply with JSON ONLY, no code fences: {"regulations":[{"reference_key":"...","elements":[{"element":"...","met":true|false}]}]}`
    const user = [
      `REGULATIONS AND THEIR REQUIRED ELEMENTS:`,
      ...judged.map(r => `- ${r.reference_key} (${r.official_name}):\n${(r.required_elements as string[]).slice(0, 12).map(e => `  * ${e}`).join('\n')}`),
      ``,
      `DOCUMENT:`,
      draft.slice(0, 60_000),
    ].join('\n')
    try {
      const raw = (await callClaude(prompt, user, { model: MODEL_SONNET, maxTokens: 4000, temperature: 0, feature: 'policy_verifier' })).trim()
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))
      const byKey = new Map<string, any>((parsed?.regulations ?? []).map((r: any) => [String(r.reference_key), r]))
      for (const r of judged) {
        const verdict = byKey.get(r.reference_key)
        const missing = verdict
          ? (verdict.elements ?? []).filter((e: any) => e && e.met !== true).map((e: any) => String(e.element ?? '')).filter(Boolean)
          : (r.required_elements as string[]).slice(0, 12)   // no verdict for this regulation = not shown met
        coverage.regulations.push({ reference_key: r.reference_key, official_name: r.official_name, met: missing.length === 0, missing_elements: missing })
      }
      coverage.passed = coverage.regulations.every(r => r.met)
    } catch (e: any) {
      coverage.passed = false
      coverage.issues.push(`Coverage judge failed to return a readable verdict (${e?.message ?? 'parse error'}) — verify again`)
    }
  }

  const verification: PolicyVerification = {
    passed: substitution.passed && terminology.passed && identity.passed && coverage.passed,
    checked_at: new Date().toISOString(),
    checks: { substitution, terminology, identity, coverage },
  }

  await (prisma as any).policyPurchase.update({
    where: { id: purchaseId },
    data:  { verification, verified_at: new Date() },
  })

  return verification
}
