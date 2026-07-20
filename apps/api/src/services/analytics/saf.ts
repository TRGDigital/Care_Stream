// CQC Single Assessment Framework — coverage rollup. For each quality statement, inherit a
// covered / partial / gap status from the verified regulation coverage of the statement's
// crosswalk (never re-matched). Grouped by key question. This is the SAF readiness data layer.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { downloadExtractedText } from '../storage/s3'
import { checkAiCreditLimit, logAiCredit } from '../../lib/plan-limits'

export type SafStatement = {
  number: number; reference_key: string; name: string; we_statement: string
  status: 'covered' | 'partial' | 'gap' | 'not_assessed'
  covered: number; partial: number; gap: number; not_assessed: number; assessed: number
  score: number | null
  expectation_cues: string[]; expected_policies: string[]
  regulations: Array<{ reference_key: string; official_name: string; status: string }>
}
export type SafKeyQuestion = { q: string; label: string; score: number | null; covered: number; partial: number; gap: number; statements: SafStatement[] }
export type SafOverview = { key_questions: SafKeyQuestion[]; summary: { statements: number; covered: number; partial: number; gap: number; score: number | null } }

const KQ_LABEL: Record<string, string> = { safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', 'well-led': 'Well-led' }
const KQ_ORDER = ['safe', 'effective', 'caring', 'responsive', 'well-led']
const avg = (ns: number[]) => ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : null

export async function qualityStatementCoverage(tenantId: string): Promise<SafOverview> {
  const [statements, coverage] = await Promise.all([
    (prisma as any).qualityStatement.findMany({ where: { is_active: true }, orderBy: { number: 'asc' } }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { reference_key: true, status: true } }),
  ])
  const covMap = new Map<string, string>((coverage as any[]).map(c => [c.reference_key, c.status]))
  const allKeys = [...new Set((statements as any[]).flatMap(s => (s.linked_regulations as string[]) ?? []))]
  const regs = allKeys.length
    ? await (prisma as any).externalRegulation.findMany({ where: { reference_key: { in: allKeys } }, select: { reference_key: true, official_name: true } })
    : []
  const nameMap = new Map<string, string>((regs as any[]).map(r => [r.reference_key, r.official_name]))

  const byKq = new Map<string, SafStatement[]>()
  for (const s of statements as any[]) {
    let covered = 0, partial = 0, gap = 0, notAssessed = 0
    const regList: SafStatement['regulations'] = []
    for (const key of (s.linked_regulations as string[]) ?? []) {
      const st = covMap.get(key)
      if (st === 'covered') covered++
      else if (st === 'partial') partial++
      else if (st === 'gap') gap++
      else notAssessed++
      regList.push({ reference_key: key, official_name: nameMap.get(key) ?? key, status: st ?? 'not_assessed' })
    }
    const assessed = covered + partial + gap
    const score = assessed > 0 ? Math.round(((covered + partial * 0.5) / assessed) * 100) : null
    const status: SafStatement['status'] = assessed === 0 ? 'not_assessed'
      : (gap === 0 && partial === 0) ? 'covered'
      : (covered === 0 && partial === 0) ? 'gap'
      : 'partial'
    const item: SafStatement = {
      number: s.number, reference_key: s.reference_key, name: s.name, we_statement: s.we_statement,
      status, covered, partial, gap, not_assessed: notAssessed, assessed, score,
      expectation_cues: (s.expectation_cues as string[]) ?? [], expected_policies: (s.expected_policies as string[]) ?? [],
      regulations: regList,
    }
    if (!byKq.has(s.key_question)) byKq.set(s.key_question, [])
    byKq.get(s.key_question)!.push(item)
  }

  const key_questions: SafKeyQuestion[] = [...byKq.entries()]
    .sort((a, b) => KQ_ORDER.indexOf(a[0]) - KQ_ORDER.indexOf(b[0]))
    .map(([q, sts]) => ({
      q, label: KQ_LABEL[q] ?? q,
      score: avg(sts.map(s => s.score).filter((n): n is number => n != null)),
      covered: sts.filter(s => s.status === 'covered').length,
      partial: sts.filter(s => s.status === 'partial').length,
      gap: sts.filter(s => s.status === 'gap' || s.status === 'not_assessed').length,
      statements: sts,
    }))

  const all = key_questions.flatMap(k => k.statements)
  const summary = {
    statements: all.length,
    covered: all.filter(s => s.status === 'covered').length,
    partial: all.filter(s => s.status === 'partial').length,
    gap: all.filter(s => s.status === 'gap' || s.status === 'not_assessed').length,
    score: avg(all.map(s => s.score).filter((n): n is number => n != null)),
  }
  return { key_questions, summary }
}

// ── Wording alignment (Phase 2) ────────────────────────────────────────────────
// For a regulation, find the CQC quality statement(s) it evidences, and judge whether the
// policy that covers it READS the way CQC's SAF expects (person-centred), not just whether it
// covers the requirement. Drafts person-centred additions in the policy's own voice, adoptable
// through the same flow as gap suggestions. Consumes an AI credit (called via the route).
export type SafAlignment = { focus: string; placement: 'amend' | 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string }
export type SafAlignmentResult = {
  statements: Array<{ reference_key: string; name: string; we_statement: string }>
  target_policy: { id: string; name: string } | null
  alignments: SafAlignment[]
  message: string
}

function parseJson(text: string): any {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a < 0 || b < 0) return {}
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return {} }
}

export async function safAlignment(tenantId: string, referenceKey: string, policyId: string, force = false): Promise<SafAlignmentResult> {
  const statements = await (prisma as any).qualityStatement.findMany({
    where: { is_active: true, linked_regulations: { has: referenceKey } },
    select: { reference_key: true, name: true, we_statement: true, expectation_cues: true },
    orderBy: { number: 'asc' },
  })
  const stmtOut = (statements as any[]).map(s => ({ reference_key: s.reference_key, name: s.name, we_statement: s.we_statement }))
  if (!statements.length) return { statements: [], target_policy: null, alignments: [], message: 'This regulation is not linked to any CQC quality statement.' }

  // Assess the policy shown in the Coverage detail (the target policy: the one that evidences
  // this regulation for a partial/covered, or the best place to build it up for a gap).
  const policy = policyId ? await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { id: true, name: true } }) : null
  if (!policy) return { statements: stmtOut, target_policy: null, alignments: [], message: 'There is no policy to check for this regulation yet.' }

  // Cache keyed on the coverage row (per regulation), cleared when coverage is re-analysed.
  const coverage = await (prisma as any).regulationCoverage.findFirst({ where: { tenant_id: tenantId, reference_key: referenceKey }, select: { id: true, saf_alignment: true } })
  if (!force && coverage?.saf_alignment && typeof coverage.saf_alignment === 'object' && (coverage.saf_alignment as any)?.target_policy?.id === policy.id) {
    return coverage.saf_alignment as SafAlignmentResult
  }

  const raw = await downloadExtractedText(tenantId, policy.id).catch(() => null)
  const policyText = (raw ?? '').slice(0, 12000)
  if (!policyText) return { statements: stmtOut, target_policy: { id: policy.id, name: policy.name }, alignments: [], message: 'The policy text is not available to check.' }

  await checkAiCreditLimit(tenantId)   // throws PlanLimitError → 402 in the route

  const cues = [...new Set((statements as any[]).flatMap(s => (s.expectation_cues as string[]) ?? []))].slice(0, 14)
  const keepTerms = ((await (prisma as any).platformGlossary.findMany({ where: { keep: true }, select: { term: true } }).catch(() => [])) as any[]).map(t => t.term).slice(0, 30)

  const system = 'You are a CQC inspection expert helping a care provider make a policy read the way CQC\'s Single Assessment Framework expects. Respond only with valid JSON.'
  const user = `CQC quality statement(s) this policy evidences:
${(statements as any[]).map(s => `- ${s.name}: "${s.we_statement}"`).join('\n')}

The person-centred qualities CQC looks for in the wording:
${cues.map((c, i) => `${i + 1}. ${c}`).join('\n')}

The policy as written:
"""
${policyText}
"""

Task: find up to 5 of those person-centred qualities that this policy's WORDING does not already reflect well. For each one, PREFER to improve wording that is already there:
- Locate the exact existing sentence or short passage (1 to 3 sentences), copied VERBATIM from the policy above, that covers this area but reads too procedurally or omits the person-centred framing.
- Rewrite it in THIS policy's own voice and style so it reflects the quality, keeping every fact, name, role and specific it already contains, and inventing nothing.
- Set "placement" to "amend", set "anchor" to that exact existing passage (verbatim, the full text being replaced), and set "wording" to your rewritten version that will REPLACE that passage.

Only if the policy genuinely contains no relevant passage to improve for that quality, add new wording instead: use "add_under_heading" with "anchor" set to a short verbatim heading or sentence it should sit under, or "new_section" with a "section_title" when there is no relevant place at all. Always prefer "amend" of existing wording over adding new wording wherever a relevant passage exists.

Only include genuine improvements; if the policy already reflects a quality well, omit it. Keep these terms exact where used: ${keepTerms.join(', ')}.

Respond with JSON only:
{"alignments":[{"focus":"<short label of the person-centred quality>","placement":"amend|add_under_heading|new_section","anchor":"<the exact existing passage to replace for amend, a heading or sentence to add under for add_under_heading, or empty for new_section>","section_title":"<title for a new section, or empty>","wording":"<the rewritten passage for amend, or the new wording to add>"}]}`

  let alignments: SafAlignment[] = []
  try {
    const text = await callClaude(system, user, { maxTokens: 2600, temperature: 0.3 })
    const parsed = parseJson(text)
    alignments = (Array.isArray(parsed.alignments) ? parsed.alignments : [])
      .filter((a: any) => a && String(a.wording ?? '').trim() && String(a.focus ?? '').trim())
      .slice(0, 5)
      .map((a: any) => {
        let placement: SafAlignment['placement'] = (a.placement === 'amend' || a.placement === 'add_under_heading') ? a.placement : 'new_section'
        const anchor = String(a.anchor ?? '').trim().slice(0, 600)
        // amend/add_under_heading need an anchor to locate; without one, treat as a new section.
        if ((placement === 'amend' || placement === 'add_under_heading') && !anchor) placement = 'new_section'
        return {
          focus: String(a.focus).trim().slice(0, 160),
          placement,
          anchor,
          section_title: String(a.section_title ?? '').trim().slice(0, 200),
          wording: String(a.wording).trim().slice(0, 4000),
        }
      })
  } catch (e: any) {
    console.error('[saf] alignment failed', e?.message)
    return { statements: stmtOut, target_policy: { id: policy.id, name: policy.name }, alignments: [], message: 'The wording check could not be completed. Please try again.' }
  }

  const message = alignments.length
    ? `Reads well overall, but ${alignments.length} area${alignments.length === 1 ? '' : 's'} could be more person-centred for CQC.`
    : 'This policy already reads in a person-centred way for the linked quality statement(s).'
  const result: SafAlignmentResult = { statements: stmtOut, target_policy: { id: policy.id, name: policy.name }, alignments, message }

  // Cache on the coverage row (cleared when coverage is re-analysed) and charge a credit only
  // when the AI actually produced suggestions.
  if (coverage?.id) await (prisma as any).regulationCoverage.update({ where: { id: coverage.id }, data: { saf_alignment: result, saf_analysed_at: new Date() } }).catch(() => {})
  if (alignments.length > 0) await logAiCredit(tenantId, 'saf_alignment', referenceKey)
  return result
}
