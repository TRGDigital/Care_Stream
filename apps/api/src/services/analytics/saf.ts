// CQC Single Assessment Framework — coverage rollup. For each quality statement, inherit a
// covered / partial / gap status from the verified regulation coverage of the statement's
// crosswalk (never re-matched). Grouped by key question. This is the SAF readiness data layer.

import { prisma } from '../../db/client'

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
