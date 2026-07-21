// ─── CQC Readiness Score ──────────────────────────────────────────────────────
// A single, trended readiness indicator per CQC key question, blending two signals:
//   • Audit performance  — how the service is doing IN PRACTICE, scored 0-100 per domain by the
//     AI from completed monthly audits (stored on each run as readiness_scores).
//   • Policy coverage     — whether it is written down, from Regulation coverage mapped to the
//     five key questions via the quality statements crosswalk.
// The two are blended 50/50 per domain; the overall score is the mean of the domains.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

export const DOMAINS = ['safe', 'effective', 'caring', 'responsive', 'well_led'] as const
export type Domain = (typeof DOMAINS)[number]
export const DOMAIN_LABEL: Record<Domain, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', well_led: 'Well-led',
}
// quality_statements.key_question uses 'well-led' with a hyphen.
const kqToDomain = (kq: string): Domain | null => {
  const k = String(kq || '').toLowerCase().replace('-', '_')
  return (DOMAINS as readonly string[]).includes(k) ? (k as Domain) : null
}

const clamp = (n: any): number | null => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null
}
const ragOf = (s: number | null): 'green' | 'amber' | 'red' | 'none' =>
  s == null ? 'none' : s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red'
const bandOf = (s: number | null): string =>
  s == null ? 'Not yet scored' : s >= 85 ? 'Strong' : s >= 70 ? 'Good' : s >= 55 ? 'Needs attention' : 'Priority'

// ── Audit signal: AI-score one audit's domains (called when recommendations are generated) ──
export async function scoreAuditDomains(auditName: string, auditResultsText: string): Promise<Record<string, number | null> | null> {
  const system = 'You score how ready a UK care service looks against the CQC Single Assessment Framework, based on one completed audit. Score strictly from the evidence: NO answers, gaps and weak findings lower the score.'
  const user = [
    `Below is a completed "${auditName}" audit. For each CQC key question this audit gives evidence about, give a readiness score from 0 to 100 (higher is better). If the audit gives no evidence about a key question, use null. Also give an overall score (0-100) for what this audit shows.`,
    'Return ONLY JSON with these keys: {"overall": <0-100>, "safe": <0-100 or null>, "effective": <0-100 or null>, "caring": <0-100 or null>, "responsive": <0-100 or null>, "well_led": <0-100 or null>}',
    '',
    'AUDIT RESULTS:',
    auditResultsText.slice(0, 12000),
  ].join('\n')
  try {
    const out = await callClaude(system, user, { maxTokens: 300, temperature: 0 })
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    const scores: Record<string, number | null> = { overall: clamp(parsed.overall) }
    for (const d of DOMAINS) scores[d] = parsed[d] == null ? null : clamp(parsed[d])
    return scores
  } catch {
    return null
  }
}

// ── Policy coverage per domain (from Regulation coverage + the quality-statements crosswalk) ──
async function policyCoverageByDomain(tenantId: string): Promise<Record<Domain, number | null>> {
  const out: Record<Domain, number | null> = { safe: null, effective: null, caring: null, responsive: null, well_led: null }
  const [statements, coverage] = await Promise.all([
    (prisma as any).qualityStatement.findMany({ where: { is_active: true }, select: { key_question: true, linked_regulations: true } }).catch(() => []),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { reference_key: true, status: true } }).catch(() => []),
  ])
  if (!coverage.length) return out
  const statusVal = new Map<string, number>()
  for (const c of coverage as any[]) statusVal.set(c.reference_key, c.status === 'covered' ? 1 : c.status === 'partial' ? 0.5 : 0)

  // domain -> the coverage values of its linked, analysed regulations
  const byDomain = new Map<Domain, number[]>()
  for (const s of statements as any[]) {
    const d = kqToDomain(s.key_question)
    if (!d) continue
    for (const reg of (s.linked_regulations ?? [])) {
      if (statusVal.has(reg)) { const arr = byDomain.get(d) ?? []; arr.push(statusVal.get(reg)!); byDomain.set(d, arr) }
    }
  }
  for (const d of DOMAINS) {
    const vals = byDomain.get(d)
    if (vals && vals.length) out[d] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
  }
  return out
}

// ── Audit performance per domain (aggregate recent runs' AI domain scores) ──
async function auditPerformanceByDomain(tenantId: string): Promise<Record<Domain, number | null>> {
  const out: Record<Domain, number | null> = { safe: null, effective: null, caring: null, responsive: null, well_led: null }
  const since = new Date(Date.now() - 120 * 86_400_000)
  const runs = await (prisma as any).auditRun.findMany({
    where: { tenant_id: tenantId, status: 'completed', readiness_scores: { not: null as any }, completed_at: { gte: since } },
    select: { readiness_scores: true, completed_at: true },
    orderBy: { completed_at: 'desc' }, take: 60,
  }).catch(() => [])
  const acc = new Map<Domain, number[]>()
  for (const r of runs as any[]) {
    const rs = r.readiness_scores as Record<string, number | null> | null
    if (!rs) continue
    for (const d of DOMAINS) {
      const v = rs[d]
      if (typeof v === 'number') { const arr = acc.get(d) ?? []; arr.push(v); acc.set(d, arr) }
    }
  }
  for (const d of DOMAINS) {
    const vals = acc.get(d)
    if (vals && vals.length) out[d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  return out
}

export type ReadinessResult = {
  overall: number | null
  rag: string
  band: string
  updated_at: string
  has_audit: boolean
  has_policy: boolean
  domains: Array<{ key: Domain; label: string; score: number | null; rag: string; band: string; audit: number | null; policy: number | null }>
  trend: Array<{ period: string; overall: number }>
}

export async function getReadinessScore(tenantId: string): Promise<ReadinessResult> {
  const [policy, audit] = await Promise.all([policyCoverageByDomain(tenantId), auditPerformanceByDomain(tenantId)])

  const domains = DOMAINS.map(key => {
    const a = audit[key], p = policy[key]
    const score = a != null && p != null ? Math.round(0.5 * a + 0.5 * p) : a != null ? a : p != null ? p : null
    return { key, label: DOMAIN_LABEL[key], score, rag: ragOf(score), band: bandOf(score), audit: a, policy: p }
  })
  const scored = domains.map(d => d.score).filter((s): s is number => s != null)
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null
  const has_audit = DOMAINS.some(d => audit[d] != null)
  const has_policy = DOMAINS.some(d => policy[d] != null)

  // Persist a snapshot for this month so the score can be trended.
  if (overall != null) {
    const period = new Date(); period.setDate(1); period.setHours(0, 0, 0, 0)
    await (prisma as any).readinessSnapshot.upsert({
      where:  { tenant_id_period: { tenant_id: tenantId, period } },
      update: { overall, safe: domains[0].score, effective: domains[1].score, caring: domains[2].score, responsive: domains[3].score, well_led: domains[4].score, computed_at: new Date() },
      create: { tenant_id: tenantId, period, overall, safe: domains[0].score, effective: domains[1].score, caring: domains[2].score, responsive: domains[3].score, well_led: domains[4].score },
    }).catch(() => {})
  }

  const snaps = await (prisma as any).readinessSnapshot.findMany({ where: { tenant_id: tenantId }, select: { period: true, overall: true }, orderBy: { period: 'asc' }, take: 12 }).catch(() => [])
  const trend = (snaps as any[]).map(s => ({ period: new Date(s.period).toISOString().slice(0, 10), overall: s.overall }))

  return { overall, rag: ragOf(overall), band: bandOf(overall), updated_at: new Date().toISOString(), has_audit, has_policy, domains, trend }
}
