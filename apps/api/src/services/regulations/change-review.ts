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
/** The part of a page that counts as its content.
 *
 *  Sentences over 25 characters. Everything shorter is page furniture that survived the tag
 *  stripping: a rotating "last reviewed" date, a reading-time counter, a breadcrumb, a
 *  cookie line. Those move on their own schedule and say nothing about the regulation.
 *
 *  Exported because the monitor's fingerprint must be taken over exactly this. Hashing the
 *  whole stripped page while diffing only the long sentences meant the two could disagree,
 *  and they did: on the live data, 24 of 31 hash-fingerprinted sources were flagged as
 *  changed while the diff found nothing in any of them. Every one of those was a short
 *  fragment moving. The alert said "changed", the review queue stayed empty, and
 *  last_changed_at became a column nobody could believe.
 *
 *  Taking both from one definition makes that disagreement unrepresentable: if the
 *  fingerprint moves there is a sentence to show for it. */
export function meaningfulLines(s: string): string[] {
  return s.split(/(?<=[.!?])\s+|\n+/).map(l => l.trim()).filter(l => l.length > 25 && !isNoiseLine(l))
}

// Lines that move every week without the regulation changing: the legislation.gov.uk currency statement, "Last updated" stamps, page numbers and
// cookie wording. They are dropped before the fingerprint and the diff, so they can never flag a regulation. A stamp that carries real words
// (for example "Updated the section on notifications to include new timescales") is kept, because the words are the change.
const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const DATE_SRC = `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\.?,?\\s+\\d{4}\\b|\\b${MONTHS}\\s+\\d{4}\\b|\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b`
const HAS_DATE = new RegExp(DATE_SRC, 'i')
const ALL_DATES = new RegExp(DATE_SRC, 'gi')
const STAMP_WORDS = /\b(last|updated|update|published|revised|reviewed|review|modified|on|date|as|at|from|current|currency|until|version|this|page|was|is|latest|available|statement|the|of|to|and|a)\b/gi
const CURRENCY = /changes to legislation|up to date with all changes known|latest available \(revised\)|point in time|there are changes that may be brought into force/i
const FURNITURE = /cookie|accept all|reject all|skip to main content|back to top|is this page useful|page \d+ of \d+|results per page|follow us on/i
export function isNoiseLine(l: string): boolean {
  if (CURRENCY.test(l) || FURNITURE.test(l)) return true
  if (!HAS_DATE.test(l)) return false
  const rest = l.replace(ALL_DATES, ' ').replace(STAMP_WORDS, ' ').replace(/[^a-z]+/gi, ' ').trim()
  return rest.split(/\s+/).filter(w => w.length > 1).length < 3
}

export function diffText(oldText: string, newText: string): SourceDiff {
  const before = new Set(meaningfulLines(oldText))
  const after  = new Set(meaningfulLines(newText))

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

/** Always appended, even when an edited prompt is stored, so the per sentence verdict never depends on the wording of the prompt. */
export const LINE_RELEVANCE_RULES = `

SENTENCE BY SENTENCE
Every added and removed sentence is numbered (A1, A2 ... and R1, R2 ...). Decide which ones are RELEVANT to a care provider's written policies.
RELEVANT: a duty, right, timescale, threshold, figure, definition, named body or document, process or requirement a policy would state or rely on.
NOT RELEVANT: cookie and analytics banners ("These send information about how our site is used to Google Analytics", "Let us know if this is OK"), navigation,
page furniture, section numbering and sentence fragments cut mid way ("Introduction 1.1 The purpose of this policy is to: a."), contact details, "related content",
accessibility statements, dates, and anything that is only a re-wording with the same meaning.
When in doubt about a sentence that carries a real duty or figure, mark it relevant. When a sentence is a cut off fragment or page furniture, mark it not relevant.
Add these two fields to the JSON:
  "relevant_added": [the numbers of the ADDED sentences that are relevant, for example [2, 5]],
  "relevant_removed": [the numbers of the REMOVED sentences that are relevant],
  "ignored_note": "One short sentence saying what the sentences you marked not relevant were (for example 'cookie banner wording and page numbering')."
If none are relevant use empty lists, "severity" "cosmetic" and "affects_policies" false.`

async function reviewPrompt(): Promise<string> {
  let base = DEFAULT_CHANGE_REVIEW_PROMPT
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: CHANGE_REVIEW_PROMPT_USAGE } })
    const stored = typeof row?.content === 'string' ? row.content.trim() : ''
    if (stored) base = stored
  } catch { /* fall through */ }
  return base + LINE_RELEVANCE_RULES
}

export type ChangeReview = {
  severity: string
  affects_policies: boolean
  summary: string
  impact_note: string
  /** The sentences judged relevant to policies; everything else in the change is treated as not relevant. */
  relevant_added: string[]
  relevant_removed: string[]
  ignored_note: string
}

const pick = (lines: string[], nums: any): string[] => {
  if (!Array.isArray(nums)) return []
  const out = new Set<number>()
  for (const n of nums) { const i = Number(String(n).replace(/\D/g, '')); if (i >= 1 && i <= lines.length) out.add(i - 1) }
  return [...out].sort((a, b) => a - b).map(i => lines[i])
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

  const addedLines = input.added.split('\n').map(l => l.trim()).filter(Boolean)
  const removedLines = input.removed.split('\n').map(l => l.trim()).filter(Boolean)
  const user = [
    `REGULATION OR STANDARD: ${input.officialName}`,
    `SOURCE PAGE: ${input.url}`,
    '',
    addedLines.length   ? `ADDED TO THE PAGE:\n${addedLines.map((l, i) => `A${i + 1}. ${l}`).join('\n')}`       : 'NOTHING WAS ADDED.',
    '',
    removedLines.length ? `REMOVED FROM THE PAGE:\n${removedLines.map((l, i) => `R${i + 1}. ${l}`).join('\n')}` : 'NOTHING WAS REMOVED.',
  ].join('\n')

  try {
    const raw = await callClaude(await reviewPrompt(), user, {
      model: MODEL, maxTokens: 1200, temperature: 0.1, feature: 'regulation_change_review',
    })
    // The model is told to return bare JSON; a stray fence should not lose the review.
    const json = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(json)
    let severity = ['material', 'minor', 'cosmetic'].includes(parsed?.severity) ? parsed.severity : 'minor'
    const relevant_added = pick(addedLines, parsed?.relevant_added), relevant_removed = pick(removedLines, parsed?.relevant_removed)
    let affects = !!parsed?.affects_policies
    // Nothing relevant in the wording means nothing for a policy to change, whatever else the answer said.
    if (relevant_added.length === 0 && relevant_removed.length === 0) { severity = 'cosmetic'; affects = false }
    return {
      severity,
      affects_policies: affects,
      summary:     String(parsed?.summary ?? '').slice(0, 1200),
      impact_note: String(parsed?.impact_note ?? '').slice(0, 1200),
      relevant_added, relevant_removed,
      ignored_note: String(parsed?.ignored_note ?? '').slice(0, 300),
    }
  } catch (e: any) {
    console.error('[change-review] failed:', e?.message ?? e)
    return null
  }
}

/** The page text as stored keeps its HTML codes (&nbsp; &raquo; &rsquo;). Turned back into the characters for people and for the model to read. */
const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", raquo: '»', laquo: '«', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', pound: '£', hellip: '…', copy: '©', bull: '•' }
export function decodeEntities(t: string): string {
  return String(t ?? '')
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)) } catch { return ' ' } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)) } catch { return ' ' } })
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
}

/** A stored diff as clean sentences: HTML codes decoded, and the noise lines (dates, cookie banners, page numbers) dropped. Older changes were
 *  recorded before the filter existed, so this is applied when they are read, not only when they are made. */
export function diffLines(t: string): string[] {
  return decodeEntities(t).split('\n').map(l => l.trim()).filter(l => l && !isNoiseLine(l))
}
const cleanDiff = (t: string) => diffLines(t).join('\n')

/** Remember which sentences were judged relevant. Quietly does nothing if the table has not been created yet. */
export async function saveLineReview(changeId: string, r: ChangeReview): Promise<void> {
  const data = { relevant_added: r.relevant_added, relevant_removed: r.relevant_removed, ignored_note: r.ignored_note }
  await (prisma as any).regulationChangeReview.upsert({ where: { change_id: changeId }, create: { change_id: changeId, ...data }, update: data }).catch(() => {})
}

/** The stored relevance verdicts for these changes, by change id. Empty when none exist (or the table is not there yet). */
export async function loadLineReviews(ids: string[]): Promise<Map<string, { relevant_added: string[]; relevant_removed: string[]; ignored_note: string }>> {
  if (!ids.length) return new Map()
  const rows = await (prisma as any).regulationChangeReview.findMany({ where: { change_id: { in: ids } } }).catch(() => [])
  return new Map((rows as any[]).map(r => [r.change_id, { relevant_added: (r.relevant_added as string[]) ?? [], relevant_removed: (r.relevant_removed as string[]) ?? [], ignored_note: r.ignored_note ?? '' }]))
}

/** Explain one change now (the Explain this change button). Noise-only changes are settled without the model. */
export async function reviewOneChange(id: string): Promise<{ ok: boolean; change?: any; message?: string }> {
  const c = await (prisma as any).regulationChange.findUnique({ where: { id } }).catch(() => null)
  if (!c) return { ok: false, message: 'That change no longer exists.' }
  const added = cleanDiff(c.added_text), removed = cleanDiff(c.removed_text)
  let data: any
  if (!added && !removed) data = { severity: 'cosmetic', affects_policies: false, summary: 'Only dates, page numbers or site wording changed.', impact_note: 'The requirement itself is unchanged.', reviewed_at: new Date() }
  else {
    const r = await reviewChange({ officialName: c.official_name, url: c.url, added, removed })
    if (!r) return { ok: false, message: 'The explanation could not be made just now. Please try again in a minute.' }
    data = { severity: r.severity, affects_policies: r.affects_policies, summary: r.summary, impact_note: r.impact_note, reviewed_at: new Date() }
    await saveLineReview(id, r)
  }
  const change = await (prisma as any).regulationChange.update({ where: { id }, data })
  await clearAutoFlags().catch(() => 0)
  return { ok: true, change }
}

/** A regulation the monitor flagged on its own stays flagged only while a real change is open behind it: a change still to be explained, or one
 *  judged material or to affect policies. Flags with nothing behind them (a header that ticked, a date that moved) are cleared. A flag a person
 *  set by hand has a different note and is never touched. */
export async function clearAutoFlags(): Promise<number> {
  const flagged = await (prisma as any).externalRegulation.findMany({
    where: { needs_update: true, review_note: { startsWith: 'Source page changed (auto-detected' } }, select: { reference_key: true },
  }).catch(() => [])
  if (!flagged.length) return 0
  const keys = (flagged as any[]).map(f => f.reference_key)
  const open = await (prisma as any).regulationChange.findMany({
    where: { subject_kind: 'regulation', reference_key: { in: keys }, status: 'new', OR: [{ reviewed_at: null }, { severity: { in: ['material', 'minor'] } }, { affects_policies: true }] },
    select: { reference_key: true },
  }).catch(() => [])
  const openKeys = new Set((open as any[]).map(o => o.reference_key))
  const toClear = keys.filter((k: string) => !openKeys.has(k))
  if (toClear.length) await (prisma as any).externalRegulation.updateMany({ where: { reference_key: { in: toClear } }, data: { needs_update: false, review_note: '' } }).catch(() => {})
  return toClear.length
}

/** Review any change that has not been reviewed yet. Runs after the monitor, and separately,
 *  so a model outage delays explanations rather than losing detections.
 *
 *  A change whose only differences are dates, page numbers or site wording is settled here without the model (free and instant): it is marked
 *  cosmetic. Only changes with real wording left go to the model, at most `limit` per run. Afterwards flags with nothing open behind them are cleared. */
export async function reviewPendingChanges(limit = 25): Promise<{ reviewed: number; failed: number; auto_cosmetic: number; flags_cleared: number }> {
  const unreviewed = await (prisma as any).regulationChange.findMany({
    where:   { reviewed_at: null },
    orderBy: { detected_at: 'asc' },
    take:    400,
  }).catch(() => [])
  // Changes explained before sentence by sentence relevance existed are looked at again once, so they show what matters and what does not.
  const explained = await (prisma as any).regulationChange.findMany({
    where:   { reviewed_at: { not: null }, status: 'new', NOT: { added_text: '', removed_text: '' } },
    orderBy: { detected_at: 'desc' },
    take:    300,
  }).catch(() => [])
  const have = await loadLineReviews((explained as any[]).map(c => c.id))
  const pending = [...(unreviewed as any[]), ...(explained as any[]).filter(c => !have.has(c.id) && (cleanDiff(c.added_text) || cleanDiff(c.removed_text)))]

  let reviewed = 0, failed = 0, auto = 0, usedModel = 0
  for (const c of pending as any[]) {
    const added = cleanDiff(c.added_text), removed = cleanDiff(c.removed_text)
    if (!added && !removed) {
      await (prisma as any).regulationChange.update({
        where: { id: c.id },
        data: { severity: 'cosmetic', affects_policies: false, summary: 'Only dates, page numbers or site wording changed.', impact_note: 'The requirement itself is unchanged.', reviewed_at: new Date() },
      }).then(() => { auto++ }).catch(() => { failed++ })
      continue
    }
    if (usedModel >= limit) continue
    usedModel++
    const r = await reviewChange({ officialName: c.official_name, url: c.url, added, removed })
    if (!r) { failed++; continue }
    await (prisma as any).regulationChange.update({
      where: { id: c.id },
      data: {
        severity: r.severity, affects_policies: r.affects_policies,
        summary: r.summary, impact_note: r.impact_note, reviewed_at: new Date(),
      },
    }).catch(() => { failed++ })
    await saveLineReview(c.id, r)
    reviewed++
  }
  const flags_cleared = await clearAutoFlags().catch(() => 0)
  return { reviewed, failed, auto_cosmetic: auto, flags_cleared }
}
