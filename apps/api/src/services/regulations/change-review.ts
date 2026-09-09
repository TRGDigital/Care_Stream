// Turning "this page changed" into something a person can act on.
//
// Three steps, deliberately separate:
//
//   diffText      what is different, computed locally, no model involved
//   resolveImpact who it lands on, read from coverage the tenants have already run
//   reviewChange  what it means, which is the only part that needs a model
//
// They are separate because they fail differently. A diff cannot be wrong, only large. An
// impact list is only as good as the last coverage analysis. A model summary can be wrong in
// ways that read as confident, so it is stored alongside the diff rather than instead of it:
// the platform view always shows the actual wording that changed, and the summary is an aid
// to reading it, never a replacement.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

const MODEL = 'claude-sonnet-4-5-20250929'

/** Cap on each side of the diff. Long enough to carry a real amendment, short enough that a
 *  wholesale page rebuild does not store a novel. */
const DIFF_CAP = 6000

export type SourceDiff = { added: string; removed: string; changed: boolean }

/** Line-level difference between two extracted pages.
 *
 *  Set-based rather than a true sequence diff: guidance pages get reordered and re-sectioned
 *  constantly, and a sequence diff reports all of that as change. What a reader wants is
 *  "which sentences are new and which are gone", which is exactly the set difference. */
export function diffText(oldText: string, newText: string): SourceDiff {
  const lines = (s: string) =>
    s.split(/(?<=[.!?])\s+|\n+/).map(l => l.trim()).filter(l => l.length > 25)

  const before = new Set(lines(oldText))
  const after  = new Set(lines(newText))

  const added   = [...after].filter(l => !before.has(l))
  const removed = [...before].filter(l => !after.has(l))

  return {
    added:   added.join('\n').slice(0, DIFF_CAP),
    removed: removed.join('\n').slice(0, DIFF_CAP),
    changed: added.length > 0 || removed.length > 0,
  }
}

export type ImpactedTenant = {
  tenant_id: string
  tenant_name: string
  account_number: string
  /** The tenant's own policy that covers this regulation, where their coverage analysis
   *  found one. Null means they have no policy behind it at all, which is a different
   *  message: theirs is a gap to fill rather than a policy to revise. */
  policy_id: string | null
  policy_name: string | null
  coverage_status: string
}

/** Who a change to this regulation lands on.
 *
 *  Read from regulation_coverage, which is the tenants' own analysis of which of their
 *  policies satisfies which regulation, so this names the actual document to revise rather
 *  than guessing from a title. Tenants who have never run the analysis do not appear: we do
 *  not know what they hold, and inventing an impact list would be worse than a short one. */
export async function resolveImpact(referenceKey: string): Promise<ImpactedTenant[]> {
  const rows = await (prisma as any).regulationCoverage.findMany({
    where:  { reference_key: referenceKey },
    select: { tenant_id: true, status: true, evidence_policy_id: true, evidence_policy_name: true },
  }).catch(() => [])
  if (!rows.length) return []

  const tenants = await (prisma as any).tenant.findMany({
    where:  { id: { in: [...new Set(rows.map((r: any) => r.tenant_id))] } },
    select: { id: true, name: true, account_number: true },
  }).catch(() => [])
  const byId = new Map<string, any>(tenants.map((t: any) => [t.id, t]))

  return rows
    .map((r: any): ImpactedTenant | null => {
      const t = byId.get(r.tenant_id)
      if (!t) return null
      return {
        tenant_id:       r.tenant_id,
        tenant_name:     t.name ?? '',
        account_number:  t.account_number ?? '',
        policy_id:       r.evidence_policy_id ?? null,
        policy_name:     r.evidence_policy_name ?? null,
        coverage_status: r.status ?? '',
      }
    })
    .filter(Boolean)
    // Tenants with a named policy first: those are the ones with something to revise.
    .sort((a: ImpactedTenant, b: ImpactedTenant) =>
      Number(!!b.policy_name) - Number(!!a.policy_name) || a.tenant_name.localeCompare(b.tenant_name))
}

export const CHANGE_REVIEW_PROMPT_USAGE = 'regulation_change_review'

export const DEFAULT_CHANGE_REVIEW_PROMPT = `You review changes to UK health and social care legislation and guidance pages.

You are given the sentences ADDED to a source page and the sentences REMOVED from it since it
was last checked, along with the name of the regulation or standard the page is the source for.

Your job is to tell a care provider whether this matters to their written policies.

Most changes do not. Source pages are re-worded, re-linked, given new contact details, have
their cookie notices updated and their "related content" rebuilt. Say so plainly when that is
what you are looking at. A false alarm costs a registered manager a day of re-reading policies
that were already correct.

Judge SEVERITY as exactly one of:
- "material"  the requirement itself changed: a new duty, a removed duty, a changed threshold,
              timescale, figure or definition that a policy would have to state differently
- "minor"     the substance is unchanged but the wording a policy might quote has moved on:
              a renamed body, a superseded document title, a changed reference
- "cosmetic"  navigation, contact details, formatting, links, related content, accessibility
              statements, or a rewrite that says the same thing

Return ONLY valid JSON, no code fences, in exactly this shape:
{
  "severity": "material" | "minor" | "cosmetic",
  "affects_policies": true | false,
  "summary": "One or two sentences, plain English, saying what changed. Name the specific duty, figure or term. Do not say 'the page was updated'.",
  "impact_note": "If it affects policies, what a provider would have to change in their own wording. If it does not, one short sentence saying why not."
}

Never invent a change that is not in the text you were given. If the added and removed text
show nothing of substance, say so and mark it cosmetic.`

async function reviewPrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: CHANGE_REVIEW_PROMPT_USAGE } })
    const stored = typeof row?.content === 'string' ? row.content.trim() : ''
    if (stored) return stored
  } catch { /* fall through */ }
  return DEFAULT_CHANGE_REVIEW_PROMPT
}

export type ChangeReview = {
  severity: string
  affects_policies: boolean
  summary: string
  impact_note: string
}

/** Ask the model what the diff means. Returns null on any failure: an unreviewed change still
 *  shows in the platform view with its diff, which is worse than a summary but better than
 *  the change being dropped because a model call failed. */
export async function reviewChange(input: {
  officialName: string
  url: string
  added: string
  removed: string
}): Promise<ChangeReview | null> {
  if (!input.added.trim() && !input.removed.trim()) return null

  const user = [
    `REGULATION OR STANDARD: ${input.officialName}`,
    `SOURCE PAGE: ${input.url}`,
    '',
    input.added.trim()   ? `ADDED TO THE PAGE:\n${input.added}`       : 'NOTHING WAS ADDED.',
    '',
    input.removed.trim() ? `REMOVED FROM THE PAGE:\n${input.removed}` : 'NOTHING WAS REMOVED.',
  ].join('\n')

  try {
    const raw = await callClaude(await reviewPrompt(), user, {
      model: MODEL, maxTokens: 900, temperature: 0.1, feature: 'regulation_change_review',
    })
    // The model is told to return bare JSON; a stray fence should not lose the review.
    const json = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(json)
    const severity = ['material', 'minor', 'cosmetic'].includes(parsed?.severity) ? parsed.severity : 'minor'
    return {
      severity,
      affects_policies: !!parsed?.affects_policies,
      summary:     String(parsed?.summary ?? '').slice(0, 1200),
      impact_note: String(parsed?.impact_note ?? '').slice(0, 1200),
    }
  } catch (e: any) {
    console.error('[change-review] failed:', e?.message ?? e)
    return null
  }
}

/** Review any change that has not been reviewed yet. Runs after the monitor, and separately,
 *  so a model outage delays explanations rather than losing detections. */
export async function reviewPendingChanges(limit = 25): Promise<{ reviewed: number; failed: number }> {
  const pending = await (prisma as any).regulationChange.findMany({
    where:   { reviewed_at: null },
    orderBy: { detected_at: 'asc' },
    take:    limit,
  }).catch(() => [])

  let reviewed = 0, failed = 0
  for (const c of pending as any[]) {
    const r = await reviewChange({
      officialName: c.official_name, url: c.url, added: c.added_text, removed: c.removed_text,
    })
    if (!r) { failed++; continue }
    await (prisma as any).regulationChange.update({
      where: { id: c.id },
      data: {
        severity: r.severity, affects_policies: r.affects_policies,
        summary: r.summary, impact_note: r.impact_note, reviewed_at: new Date(),
      },
    }).catch(() => { failed++ })
    reviewed++
  }
  return { reviewed, failed }
}
