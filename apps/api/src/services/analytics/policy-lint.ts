// ─── Phase 2b: policy lint engine (deterministic, zero-AI) ───────────────────────
//
// Scans each of a tenant's policies against the editable stale-signal catalogue
// (policy_lint_signals) plus a few structural/metadata rules. No AI, no vectors, no credits —
// just regex over the extracted text and a look at the policy's review dates. Results are
// cached per policy (policy_lint_results) so we don't re-read every document from S3 each time.

import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'
import { mapLimit } from '../../lib/translate'
import {
  type TextSignal, type LintSeverity, type LintCategory,
  signalMatches, SEVERITY_WEIGHT, defaultSignalSeeds,
} from './policy-lint-signals'

export interface LintFinding {
  signal_key:    string
  category:      LintCategory
  severity:      LintSeverity
  label:         string
  detail:        string
  superseded_by: string | null
  kind:          'text' | 'structure' | 'review_currency'
  count:         number                                 // total occurrences (text signals)
  terms:         string[]                               // DISTINCT matched strings (phrase + acronyms) — highlight/replace every one
  samples:       Array<{ match: string; index: number }> // kept for back-compat
}

export interface PolicyLintResult {
  policy_id:   string
  policy_name: string
  score:       number
  findings:    LintFinding[]
  scanned_at:  string
}

// Compile a DB signal row into the in-memory TextSignal shape the matcher understands.
function compile(row: any): TextSignal {
  return {
    id:        row.signal_key,
    category:  row.category,
    severity:  row.severity,
    label:     row.label,
    detail:    row.detail ?? '',
    phrases:   row.phrase_source ? new RegExp(row.phrase_source, 'i') : undefined,
    acronyms:  Array.isArray(row.acronyms) ? row.acronyms : [],
    supersededBy: row.superseded_by ?? undefined,
  }
}

async function loadActiveSignals(): Promise<TextSignal[]> {
  // Seed the catalogue from the code default on first use, so a scan works even before anyone
  // opens the platform editor. Idempotent (skipDuplicates on the unique signal_key).
  const total = await (prisma as any).policyLintSignal.count()
  if (total === 0) {
    await (prisma as any).policyLintSignal.createMany({ data: defaultSignalSeeds(), skipDuplicates: true }).catch(() => {})
  }
  // Only ACTIVE and APPROVED signals affect tenants. A new or newly-edited signal stays
  // Pending until a platform admin has reviewed and approved it.
  const rows = await (prisma as any).policyLintSignal.findMany({
    where: { is_active: true, approved: true },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
  })
  // Compile once, dropping any row whose stored pattern won't compile (bad manual edit) so one
  // broken signal can never take the whole scan down.
  const out: TextSignal[] = []
  for (const r of rows) { try { out.push(compile(r)) } catch { /* skip invalid regex */ } }
  return out
}

// A headline 0-100 quality score. Each DISTINCT firing signal costs its severity weight (so a
// policy saying "COVID" ten times isn't punished ten times); score = 100 - Σweight*5, floored.
function scoreFromFindings(findings: LintFinding[]): number {
  const penalty = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] ?? 1), 0)
  return Math.max(0, 100 - penalty * 5)
}

// Lint a single policy's text + row. Pure function (no I/O) so it's easy to test.
export function lintPolicyText(
  text: string,
  policy: { last_reviewed_at?: Date | null; review_interval_days?: number | null },
  signals: TextSignal[],
  now: number = Date.now(),
): LintFinding[] {
  const findings: LintFinding[] = []
  const body = text ?? ''

  // 1. Catalogue text signals (superseded refs, placeholders, time-bound wording).
  for (const s of signals) {
    const hits = signalMatches(body, s)
    if (!hits.length) continue
    // Distinct verbatim matched strings (e.g. "Primary Care Trusts", "PCTs", "PCT") so the UI
    // can highlight and replace EVERY occurrence of EACH, not just the first.
    const terms = [...new Set(hits.map(h => h.match))].slice(0, 25)
    findings.push({
      signal_key: s.id, category: s.category, severity: s.severity,
      label: s.label, detail: s.detail, superseded_by: s.supersededBy ?? null,
      kind: 'text', count: hits.length, terms, samples: hits.slice(0, 5),
    })
  }

  // 2. Structural rules (computed, still zero-AI).
  if (body.trim().length < 600) {
    findings.push({
      signal_key: 'thin-content', category: 'structure', severity: 'medium',
      label: 'Very little content',
      detail: 'The extracted policy text is under ~600 characters, which usually means a stub, a cover sheet, or a failed text extraction rather than a complete policy.',
      superseded_by: null, kind: 'structure', count: 1, terms: [], samples: [],
    })
  } else if (!/policy statement|purpose|scope|\baim\b/i.test(body)) {
    findings.push({
      signal_key: 'missing-purpose-scope', category: 'structure', severity: 'medium',
      label: 'No policy statement, purpose or scope',
      detail: 'The document does not contain a policy statement, purpose, aim or scope. A compliant policy should state what it is for and who it applies to.',
      superseded_by: null, kind: 'structure', count: 1, terms: [], samples: [],
    })
  }

  // 3. Review currency — from the policy record, never the text.
  const reviewed = policy.last_reviewed_at ? new Date(policy.last_reviewed_at).getTime() : null
  const intervalMs = (policy.review_interval_days ?? 365) * 86_400_000
  if (reviewed == null || now > reviewed + intervalMs) {
    findings.push({
      signal_key: 'overdue-review', category: 'review_currency', severity: 'high',
      label: reviewed == null ? 'No review date recorded' : 'Overdue for review',
      detail: reviewed == null
        ? 'The policy has never recorded a review date. Set a last-reviewed date and review interval so its currency can be tracked.'
        : 'The policy has passed its review interval (last reviewed date + review interval). Review it and record the new date.',
      superseded_by: null, kind: 'review_currency', count: 1, terms: [], samples: [],
    })
  }

  return findings
}

// Scan every active policy for a tenant, cache the results, and return them.
export async function scanTenantPolicies(tenantId: string): Promise<PolicyLintResult[]> {
  const [signals, policies] = await Promise.all([
    loadActiveSignals(),
    (prisma as any).policy.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { id: true, name: true, last_reviewed_at: true, review_interval_days: true },
    }),
  ])
  const now = Date.now()

  const results = await mapLimit(policies as any[], 6, async (p: any) => {
    const text = await downloadExtractedText(tenantId, p.id).catch(() => null)
    if (text == null) return null   // no extracted text (still processing) — skip, don't guess
    const findings = lintPolicyText(text, p, signals, now)
    return { policy_id: p.id, policy_name: p.name, score: scoreFromFindings(findings), findings }
  })

  const clean = results.filter(Boolean) as Array<{ policy_id: string; policy_name: string; score: number; findings: LintFinding[] }>

  // Replace this tenant's cached results in one transaction.
  await (prisma as any).$transaction([
    (prisma as any).policyLintResult.deleteMany({ where: { tenant_id: tenantId } }),
    (prisma as any).policyLintResult.createMany({
      data: clean.map(r => ({
        tenant_id: tenantId, policy_id: r.policy_id, policy_name: r.policy_name,
        score: r.score, findings: r.findings, scanned_at: new Date(now),
      })),
    }),
  ])

  return clean.map(r => ({ ...r, scanned_at: new Date(now).toISOString() }))
}

// Read the cached lint results for a tenant (no scan). Returns only policies WITH findings,
// most issues first, plus a summary for the headline.
export async function getTenantLint(tenantId: string) {
  const rows = await (prisma as any).policyLintResult.findMany({ where: { tenant_id: tenantId } })
  const scanned = rows.length > 0
  const scannedAt = scanned
    ? rows.reduce((max: Date, r: any) => (r.scanned_at > max ? r.scanned_at : max), rows[0].scanned_at)
    : null

  const withIssues = (rows as any[])
    .filter(r => Array.isArray(r.findings) && r.findings.length > 0)
    .map(r => ({ policy_id: r.policy_id, policy_name: r.policy_name, score: r.score, findings: r.findings as LintFinding[], scanned_at: new Date(r.scanned_at).toISOString() }))
    .sort((a, b) => a.score - b.score)   // worst first

  // Count distinct superseded-reference / high signals across the library for the summary.
  let highCount = 0, mediumCount = 0
  for (const p of withIssues) for (const f of p.findings) {
    if (f.severity === 'high') highCount++
    else if (f.severity === 'medium') mediumCount++
  }

  return {
    scanned,
    scanned_at: scannedAt ? new Date(scannedAt).toISOString() : null,
    policies_scanned: rows.length,
    policies_with_issues: withIssues.length,
    high_findings: highCount,
    medium_findings: mediumCount,
    policies: withIssues,
  }
}
