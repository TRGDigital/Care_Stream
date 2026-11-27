// Policy clarity and precision (pilot, CS-1001): does the policy actually tell staff what to do?
// The WHOLE policy is read, in parts when it is long, the same way the gap analysis reads a policy. Findings are quoted from the policy (a quote that is not in the policy is dropped), and a failed
// call means no result at all, never a result from half a policy. Plain readability measures are computed by rules, not by the model.

import { createHash } from 'crypto'
import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { textWindows } from '../analytics/in-batches'
import { quoteInText } from './stress'

export const POLICY_CLARITY_USAGE = 'policy_clarity'

export const DEFAULT_POLICY_CLARITY_PROMPT = `You read part of a UK care service's written policy and find wording that sounds professional but does not tell staff what to do.

Look for these eight kinds of problem, and use these exact "type" values:
- "vague"                  vague or ambiguous wording ("appropriately", "where necessary", "as required", "in a timely manner")
- "unclear_responsibility" no clear person or role who must act ("staff should ensure", "it is the responsibility of all")
- "passive"                passive wording that hides who acts ("concerns will be escalated")
- "missing_escalation"     no route for what to do next, who to tell, or how to report
- "undefined_timeframe"    no time stated where one is needed ("promptly", "immediately" with no meaning given, "regularly")
- "generic"                a generic statement with no practical instruction
- "jargon"                 jargon or abbreviations staff may not understand
- "misunderstood"          wording that a busy care worker could reasonably read two ways

Rules:
- Report every real instance in this part, most serious first. Do not pad with trivial points. A clear, specific sentence is not a finding.
- "quote" must be the policy's own words, copied exactly (one sentence or less, up to 300 characters).
- "issue" is one plain sentence saying what is unclear or missing: what is not defined, who is not named, what is not stated.
- "suggestion" is a rewrite in the style of a policy, ready to review. Use role names, never personal names. Do not invent timescales, telephone numbers, thresholds or duties: where one is needed, say what must be defined (for example "within [timescale to be set by the service]"). British English. No dashes used as punctuation.
- Judge only the wording. Never judge the quality of anyone's care.
- The text may be one part of a longer policy. Judge only this part.

Return ONLY valid JSON, no code fences:
{ "findings": [ { "quote": "", "type": "", "issue": "", "suggestion": "" } ], "summary": "One or two sentences on how clear this part is and the main weakness." }
If there is nothing to report, return an empty findings list.`

export const CLARITY_TYPES: Record<string, string> = {
  vague: 'Vague wording', unclear_responsibility: 'Unclear responsibility', passive: 'Passive wording', missing_escalation: 'Missing escalation route',
  undefined_timeframe: 'Undefined timeframe', generic: 'Generic statement', jargon: 'Jargon', misunderstood: 'Could be misunderstood',
}
export type ClarityFinding = { quote: string; type: string; type_label: string; issue: string; suggestion: string }
export type Band = 'strong' | 'good' | 'attention' | 'none'

// ── Plain readability, by rules ──────────────────────────────────────────────

export type Metrics = { words: number; sentences: number; avg_sentence_words: number; long_sentence_pct: number; passive_pct: number; reading_ease: number }
const syllables = (w: string) => Math.max(1, (w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g) ?? []).length)

export function readabilityMetrics(text: string): Metrics {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.split(' ').length >= 3)
  const words = clean.split(' ').filter(Boolean)
  const nS = Math.max(1, sentences.length), nW = Math.max(1, words.length)
  const long = sentences.filter(s => s.split(' ').length > 30).length
  const passive = sentences.filter(s => /\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i.test(s)).length
  const syl = words.reduce((n, w) => n + syllables(w.replace(/[^a-z]/gi, '') || 'a'), 0)
  const ease = 206.835 - 1.015 * (nW / nS) - 84.6 * (syl / nW)
  return { words: words.length, sentences: sentences.length, avg_sentence_words: Math.round((nW / nS) * 10) / 10, long_sentence_pct: Math.round((long / nS) * 100), passive_pct: Math.round((passive / nS) * 100), reading_ease: Math.round(ease) }
}

/** The seven checks shown in policy health, in the owner's own words. They are the first seven kinds the clarity analysis finds (the eighth, "could be misunderstood", is still reported in the clarity result). */
export const HEALTH_CHECKS: Array<{ key: string; label: string }> = [
  { key: 'vague', label: 'Vague or ambiguous wording' },
  { key: 'unclear_responsibility', label: 'Unclear responsibilities' },
  { key: 'passive', label: 'Passive language' },
  { key: 'missing_escalation', label: 'Missing escalation routes' },
  { key: 'undefined_timeframe', label: 'Undefined timeframes' },
  { key: 'generic', label: 'Generic statements without practical instructions' },
  { key: 'jargon', label: 'Excessive jargon' },
]
export type CheckResult = { key: string; label: string; count: number; band: Band }

/** Each check's band from how many passages of that kind there are for the length of the policy: none is Strong, up to one in a thousand words is Good, more is Needs attention. */
export function checkBands(findings: Array<{ type: string }>, words: number): CheckResult[] {
  return HEALTH_CHECKS.map(c => {
    const count = findings.filter(f => f.type === c.key).length
    const per1000 = words > 0 ? (count / words) * 1000 : 0
    return { ...c, count, band: count === 0 ? 'strong' : per1000 <= 1 ? 'good' : 'attention' } as CheckResult
  })
}

/** The clarity band for health: the overall band, but one check in need of attention stops it being called Strong. */
export const clarityDimBand = (overall: Band, checks: CheckResult[]): Band =>
  overall === 'strong' && checks.some(c => c.band === 'attention') ? 'good' : overall

/** Staff readability from the measures: short sentences, few long ones, not too passive, readable. */
export function readabilityBand(m: Metrics): Band {
  if (m.sentences < 5) return 'none'
  const bad = (m.avg_sentence_words > 24 ? 1 : 0) + (m.long_sentence_pct > 20 ? 1 : 0) + (m.passive_pct > 35 ? 1 : 0) + (m.reading_ease < 30 ? 1 : 0)
  return bad === 0 ? 'strong' : bad <= 1 ? 'good' : 'attention'
}

/** Clarity from how many findings there are for the length of the policy. */
export function clarityBand(findingCount: number, words: number): Band {
  if (words < 150) return 'none'
  const per1000 = (findingCount / words) * 1000
  return per1000 <= 2 ? 'strong' : per1000 <= 5 ? 'good' : 'attention'
}

// ── Never rewrite what has already been written or changed ──────────────────
// Wording that steps 1 to 4 (or an earlier adoption) wrote, or replaced, is never put forward again. A finding is dropped if its passage overlaps ANY adopted change that has not been reverted:
// either the new wording that was written, or the old wording that was replaced.
const normT = (t: string) => String(t ?? '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim()
const wordSet = (t: string) => new Set(normT(t).split(/[^a-z0-9']+/).filter(w => w.length > 3))
export function overlapsProtected(quote: string, protectedTexts: string[]): boolean {
  const q = normT(quote); if (!q) return false
  const qw = wordSet(quote)
  for (const raw of protectedTexts) {
    const n = normT(raw); if (!n) continue
    if (n.length >= 25 && q.length >= 25 && (q.includes(n) || n.includes(q))) return true
    // The same passage re-worded slightly: most of the same words.
    const nw = wordSet(raw)
    if (qw.size >= 4 && nw.size >= 4) { let inter = 0; for (const w of qw) if (nw.has(w)) inter++; if (inter / (qw.size + nw.size - inter) >= 0.5 || inter / qw.size >= 0.8) return true }
  }
  return false
}
export function filterProtected<T extends { quote: string }>(findings: T[], protectedTexts: string[]): { kept: T[]; removed: number } {
  if (!protectedTexts.length) return { kept: findings, removed: 0 }
  const kept = findings.filter(f => !overlapsProtected(f.quote, protectedTexts))
  return { kept, removed: findings.length - kept.length }
}

/** The wording adopted into each policy by any step (not reverted): new wording written and old wording replaced. Loaded once for the library or for one policy. */
export async function loadProtectedTexts(tenantId: string, policyId?: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const docs = await (prisma as any).policyDocument.findMany({ where: { tenant_id: tenantId, ...(policyId ? { policy_id: policyId } : {}) }, select: { id: true, policy_id: true } }).catch(() => [])
  if (!(docs as any[]).length) return out
  const byDoc = new Map<string, string>((docs as any[]).map(d => [d.id, d.policy_id]))
  const changes = await (prisma as any).policyDocumentChange.findMany({ where: { document_id: { in: [...byDoc.keys()] }, reverted: false }, select: { document_id: true, old_text: true, new_text: true, section_title: true } }).catch(() => [])
  for (const c of changes as any[]) {
    const pid = byDoc.get(c.document_id); if (!pid) continue
    const l = out.get(pid) ?? []
    for (const t of [c.new_text, c.old_text, c.section_title]) if (t && String(t).trim().length > 3) l.push(String(t))
    out.set(pid, l)
  }
  return out
}

/** ONE place that works out what a clarity result means, used by step 5 on the Gaps page AND the policy health row so they can never disagree.
 *  The band comes from the findings and the policy's length, is held down by any one check that needs attention and by readability that needs attention; the seven checks and staff readability come from the same result. */
export type ClarityStatus = { band: Band; checks: CheckResult[]; readability: { band: Band; detail: string }; metrics: Metrics | null; findings: number; suppressed: number; visible: Array<{ type: string; quote: string }> }
/** protectedTexts: wording already written or changed by an adopted change. Findings that overlap it are left out, so the same passage is never put forward twice. */
export function clarityStatus(row: { findings?: unknown; metrics?: unknown } | null | undefined, protectedTexts: string[] = []): ClarityStatus | null {
  if (!row) return null
  const all = (Array.isArray(row.findings) ? row.findings : []) as Array<{ type: string; quote: string }>
  const { kept: findings, removed: suppressed } = filterProtected(all, protectedTexts)
  const metrics = row.metrics && typeof row.metrics === 'object' && Object.keys(row.metrics as object).length ? (row.metrics as Metrics) : null
  const words = metrics?.words ?? 0
  const checks = checkBands(findings, words)
  const base = clarityBand(findings.length, words)
  const readability: { band: Band; detail: string } = metrics
    ? { band: readabilityBand(metrics), detail: `Average sentence ${metrics.avg_sentence_words} words, ${metrics.long_sentence_pct}% long sentences, ${metrics.passive_pct}% passive, reading ease ${metrics.reading_ease}.` }
    : { band: 'none', detail: 'Measured when clarity is run.' }
  const dim = clarityDimBand(base, checks)
  return { band: dim === 'strong' && readability.band === 'attention' ? 'good' : dim, checks, readability, metrics, findings: findings.length, suppressed, visible: findings }
}

// ── Reading the policy ───────────────────────────────────────────────────────

async function promptFor(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: POLICY_CLARITY_USAGE } })
    const stored = typeof row?.content === 'string' ? row.content.trim() : ''
    if (stored) return stored
  } catch { /* fall through */ }
  return DEFAULT_POLICY_CLARITY_PROMPT
}

/** Read one part's answer. A finding only counts if its quote is in the policy text and its type is one of the eight. */
export function parseClarity(raw: string, partText: string): { findings: ClarityFinding[]; summary: string } | null {
  let j: any
  try { j = JSON.parse(raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()) } catch { return null }
  if (!Array.isArray(j?.findings)) return null
  const findings: ClarityFinding[] = []
  for (const f of j.findings) {
    const quote = String(f?.quote ?? '').trim().slice(0, 400), type = String(f?.type ?? '')
    if (!quote || !CLARITY_TYPES[type] || !quoteInText(quote, partText)) continue
    findings.push({ quote, type, type_label: CLARITY_TYPES[type], issue: String(f?.issue ?? '').slice(0, 400), suggestion: String(f?.suggestion ?? '').slice(0, 700) })
  }
  return { findings, summary: String(j?.summary ?? '').slice(0, 400) }
}

const PART_CHARS = 20_000

export async function analyseClarity(input: { policyName: string; policyText: string; protectedTexts?: string[] }): Promise<{ findings: ClarityFinding[]; summary: string; metrics: Metrics; band: Band; prompt_hash: string } | null> {
  const sys = await promptFor()
  const parts = textWindows(input.policyText, PART_CHARS)
  const all: ClarityFinding[] = []
  const seen = new Set<string>()
  const summaries: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const user = [`POLICY: ${input.policyName}`, parts.length > 1 ? `This is part ${i + 1} of ${parts.length} of a long policy.` : '', '', 'POLICY TEXT:', parts[i]].filter(l => l !== '').join('\n')
    let r: ReturnType<typeof parseClarity> = null
    try { r = parseClarity(await callClaude(sys, user, { maxTokens: 7000, temperature: 0.1, feature: 'policy_clarity' }), parts[i]) } catch (e: any) { console.error('[policy-clarity] call failed:', e?.message ?? e) }
    if (!r) return null   // never a result from half a policy
    for (const f of filterProtected(r.findings, input.protectedTexts ?? []).kept) { const k = f.quote.toLowerCase().replace(/\s+/g, ' '); if (!seen.has(k)) { seen.add(k); all.push(f) } }   // wording already written or changed by an adopted change is never put forward again
    if (r.summary) summaries.push(r.summary)
  }
  const metrics = readabilityMetrics(input.policyText)
  const band = clarityBand(all.length, metrics.words)
  const summary = parts.length === 1 && summaries[0] ? summaries[0] : `${all.length} ${all.length === 1 ? 'passage' : 'passages'} found across ${metrics.words.toLocaleString('en-GB')} words.`
  return { findings: all, summary, metrics, band, prompt_hash: createHash('sha256').update(sys).digest('hex').slice(0, 12) }
}
