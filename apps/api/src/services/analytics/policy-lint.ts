// ─── Phase 2b: policy lint engine (deterministic, zero-AI) ───────────────────────
//
// Scans each of a tenant's policies against the editable stale-signal catalogue
// (policy_lint_signals) plus a few structural/metadata rules. No AI, no vectors, no credits —
// just regex over the extracted text and a look at the policy's review dates. Results are
// cached per policy (policy_lint_results) so we don't re-read every document from S3 each time.

import { prisma } from '../../db/client'
import { resolvedPolicyIds, clearResolutions } from './review-resolutions'
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
  source_urls:   string[]                               // authoritative page(s) evidencing the change
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
    sourceUrls: Array.isArray(row.source_urls) ? row.source_urls : [],
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

// Is a finding's stale wording still present in the draft? Mirrors detection: phrases match
// case-insensitively, acronyms/tokens match case-sensitively and word-bounded.
function termInDraft(draft: string, term: string): boolean {
  if (!term) return false
  if (/\s/.test(term)) return draft.toLowerCase().includes(term.toLowerCase())
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(draft)
}

// A text finding is resolved in the draft when the admin has adopted a change for it AND none of
// its stale terms remain in the draft. Requiring an adopted change (not just absence) avoids
// clearing a finding whose wording simply never appeared in a diverged draft.
function findingResolvedInDraft(f: LintFinding, draft: string, adoptedRefs: Set<string>): boolean {
  if (f.kind !== 'text' || !(f.terms?.length)) return false
  if (!adoptedRefs.has(`policy-lint:${f.signal_key}`)) return false
  return f.terms.every(t => !termInDraft(draft, t))
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
      source_urls: s.sourceUrls ?? [],
      kind: 'text', count: hits.length, terms, samples: hits.slice(0, 5),
    })
  }

  // 2. Structural rules (computed, still zero-AI).
  if (body.trim().length < 600) {
    findings.push({
      signal_key: 'thin-content', category: 'structure', severity: 'medium',
      label: 'Very little content',
      detail: 'The extracted policy text is under ~600 characters, which usually means a stub, a cover sheet, or a failed text extraction rather than a complete policy.',
      superseded_by: null, source_urls: [], kind: 'structure', count: 1, terms: [], samples: [],
    })
  } else if (!/policy statement|purpose|scope|\baim\b/i.test(body)) {
    findings.push({
      signal_key: 'missing-purpose-scope', category: 'structure', severity: 'medium',
      label: 'No policy statement, purpose or scope',
      detail: 'The document does not contain a policy statement, purpose, aim or scope. A compliant policy should state what it is for and who it applies to.',
      superseded_by: null, source_urls: [], kind: 'structure', count: 1, terms: [], samples: [],
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
      superseded_by: null, source_urls: [], kind: 'review_currency', count: 1, terms: [], samples: [],
    })
  }

  return findings
}

// Scan a tenant's policies, cache the results, and return them. With no policyIds it re-scans
// every active policy (full refresh); with policyIds it re-scans only those (targeted re-review)
// and upserts just those rows. Either way it clears the matching "mark as updated" resolutions
// so anything still flagged re-surfaces.
export async function scanTenantPolicies(tenantId: string, policyIds?: string[]): Promise<PolicyLintResult[]> {
  const targeted = Array.isArray(policyIds) && policyIds.length > 0
  const [signals, policies] = await Promise.all([
    loadActiveSignals(),
    (prisma as any).policy.findMany({
      where: { tenant_id: tenantId, status: 'active', ...(targeted ? { id: { in: policyIds } } : {}) },
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

  if (targeted) {
    // Upsert only the re-scanned policies, leaving the rest of the cache intact.
    await (prisma as any).$transaction(clean.map(r => (prisma as any).policyLintResult.upsert({
      where:  { tenant_id_policy_id: { tenant_id: tenantId, policy_id: r.policy_id } },
      update: { policy_name: r.policy_name, score: r.score, findings: r.findings, scanned_at: new Date(now) },
      create: { tenant_id: tenantId, policy_id: r.policy_id, policy_name: r.policy_name, score: r.score, findings: r.findings, scanned_at: new Date(now) },
    })))
  } else {
    // Full refresh: replace this tenant's cached results in one transaction.
    await (prisma as any).$transaction([
      (prisma as any).policyLintResult.deleteMany({ where: { tenant_id: tenantId } }),
      (prisma as any).policyLintResult.createMany({
        data: clean.map(r => ({
          tenant_id: tenantId, policy_id: r.policy_id, policy_name: r.policy_name,
          score: r.score, findings: r.findings, scanned_at: new Date(now),
        })),
      }),
    ])
  }

  // A fresh scan supersedes any "mark as updated" for the scanned policies.
  await clearResolutions(tenantId, 'out_of_date', targeted ? policyIds : undefined)

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

  // Overlay each finding's DISPLAY metadata (detail / superseded_by / source_urls)
  // from the live signal catalogue, keyed by signal_key — so admin edits to a signal
  // (e.g. adding a source link) show immediately, without needing a re-scan. The
  // cached result keeps the per-policy matches (terms, counts, positions).
  const sigRows = await (prisma as any).policyLintSignal.findMany({
    select: { signal_key: true, detail: true, superseded_by: true, source_urls: true },
  }).catch(() => [])
  const sigMap = new Map<string, { detail: string; superseded_by: string | null; source_urls: string[] }>()
  for (const s of sigRows as any[]) {
    sigMap.set(s.signal_key, { detail: s.detail ?? '', superseded_by: s.superseded_by ?? null, source_urls: Array.isArray(s.source_urls) ? s.source_urls : [] })
  }
  const enrich = (f: LintFinding): LintFinding => {
    const s = sigMap.get(f.signal_key)
    return s ? { ...f, detail: s.detail || f.detail, superseded_by: s.superseded_by ?? f.superseded_by, source_urls: s.source_urls } : { ...f, source_urls: f.source_urls ?? [] }
  }

  // Policies the admin has marked updated are hidden until the next scan re-flags them.
  const resolved = await resolvedPolicyIds(tenantId, 'out_of_date')

  let withIssues = (rows as any[])
    .filter(r => Array.isArray(r.findings) && r.findings.length > 0 && !resolved.has(r.policy_id))
    .map(r => ({ policy_id: r.policy_id, policy_name: r.policy_name, score: r.score, findings: (r.findings as LintFinding[]).map(enrich), scanned_at: new Date(r.scanned_at).toISOString() }))
    .sort((a, b) => a.score - b.score)   // worst first

  // Auto-clear findings the admin has already fixed in the draft: a text finding drops off once a
  // change is adopted for it and its stale wording is gone from the draft (so a corrected policy no
  // longer nags), without waiting for a re-scan. A policy with no findings left disappears.
  if (withIssues.length) {
    const policyIds = withIssues.map(p => p.policy_id)
    const docs = await (prisma as any).policyDocument.findMany({
      where: { tenant_id: tenantId, policy_id: { in: policyIds } },
      select: { id: true, policy_id: true, draft_content: true },
    }).catch(() => [])
    const docByPolicy = new Map<string, { id: string; draft_content: string }>((docs as any[]).map(d => [d.policy_id, d]))
    const docIds = (docs as any[]).map(d => d.id)
    const changes = docIds.length
      ? await (prisma as any).policyDocumentChange.findMany({
          where: { document_id: { in: docIds }, reverted: false },
          select: { document_id: true, reference_key: true },
        }).catch(() => [])
      : []
    const refsByDoc = new Map<string, Set<string>>()
    for (const c of changes as any[]) {
      if (!refsByDoc.has(c.document_id)) refsByDoc.set(c.document_id, new Set())
      refsByDoc.get(c.document_id)!.add(c.reference_key)
    }
    for (const p of withIssues) {
      const doc = docByPolicy.get(p.policy_id)
      if (!doc) continue
      const adoptedRefs = refsByDoc.get(doc.id) ?? new Set<string>()
      if (!adoptedRefs.size) continue
      p.findings = p.findings.filter(f => !findingResolvedInDraft(f, doc.draft_content ?? '', adoptedRefs))
    }
    withIssues = withIssues.filter(p => p.findings.length > 0)
  }

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
